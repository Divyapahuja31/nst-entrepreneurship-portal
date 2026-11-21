import { AUDIT_FIELDS, auditSnapshot } from './auditFields.js'
import { auditContext } from './auditContext.js'
import { recordAudit } from './audit.js'
import { sanitizeAudit } from './auditSanitize.js'

const SNAPSHOT_LIMIT = 100
const documentState = new WeakMap()
const queryState = new WeakMap()

const scopeOf = snapshot => ({
  ventureId: snapshot?.venture && String(snapshot.venture),
  studentId: snapshot?.founder ?? snapshot?.user,
  cycle: snapshot?.cycle_number ?? snapshot?.checklist_id,
})

const actionFor = (model, operation, before, after) => {
  if (operation !== 'CHANGED') {
    return `${model.toUpperCase()}_${operation}`
  }
  const keys = {
    KPI: [
      ['dueDate', 'KPI_DEADLINE_CHANGED'],
      ['founder', 'KPI_VISIBILITY_CHANGED'],
      ['scope', 'KPI_VISIBILITY_CHANGED'],
      ['venture', 'KPI_VISIBILITY_CHANGED'],
      ['status', 'KPI_STATUS_CHANGED'],
      ['isLocked', 'KPI_STATUS_CHANGED'],
    ],
    BiWeeklySubmission: [
      ['reopened_until', 'BIWEEKLY_WINDOW_CHANGED'],
      ['submitted_at', 'BIWEEKLY_SUBMISSION_CHANGED'],
      ['summaryEvidence', 'BIWEEKLY_DRAFT_CHANGED'],
    ],
  }
  const match = keys[model]?.find(
    ([field]) =>
      JSON.stringify(before?.[field]) !== JSON.stringify(after?.[field])
  )
  return match?.[1] ?? `${model.toUpperCase()}_CHANGED`
}

const recordChange = (model, operation, before, after, metadata = {}) => {
  const safeBefore = sanitizeAudit(before)
  const safeAfter = sanitizeAudit(after)
  if (
    JSON.stringify(safeBefore) === JSON.stringify(safeAfter) &&
    !metadata.authenticationChanged
  ) {
    return
  }
  const snapshot = after ?? before
  recordAudit({
    eventType: 'change',
    action: actionFor(model, operation, safeBefore, safeAfter),
    resourceType: model,
    resourceId: snapshot?._id,
    ...scopeOf(snapshot),
    outcome: 'success',
    before: safeBefore,
    after: safeAfter,
    metadata: { ...metadata, snapshotConsistency: 'best-effort' },
  })
}

// Raw collection writes bypass Mongoose middleware. Call this wrapper when
// a pipeline must retain MongoDB's exact casting/timestamp behavior.
export const auditCollectionMutation = async (model, filter, operation) => {
  const query = {
    model,
    op: 'updateMany',
    getFilter: () => filter,
    getOptions: () => ({}),
  }
  await trackQuery.call(query)
  const result = await operation()
  await finishQuery.call(query, result)
  return result
}

const captureQuery = async query => {
  try {
    return await query.model
      .find(query.getFilter())
      .select(AUDIT_FIELDS[query.model.modelName])
      .limit(SNAPSHOT_LIMIT + 1)
      .maxTimeMS(1000)
      .setOptions({ timeoutMS: 1000 })
      .lean()
  } catch {
    // Snapshot failure must not prevent the primary mutation.
    return null
  }
}

const trackQuery = async function () {
  if (!auditContext()?.captureChanges || !hasAuditedFields(this)) {
    return
  }
  queryState.set(this, { before: await captureQuery(this) })
}

const hasAuditedFields = query => {
  const update = query.getUpdate?.()
  if (!update || Array.isArray(update)) {
    return true
  }
  const paths = Object.entries(update).flatMap(([key, value]) =>
    key.startsWith('$') ? Object.keys(value) : [key]
  )
  const fields = AUDIT_FIELDS[query.model.modelName].split(' ')
  return paths.some(path =>
    fields.some(
      field =>
        field === path ||
        field.startsWith(path + '.') ||
        path.startsWith(field + '.')
    )
  )
}

const documentsAfter = async (query, result, before) => {
  const returnsAfter =
    query.op === 'findOneAndUpdate' &&
    (query.getOptions().returnDocument === 'after' || query.getOptions().new)
  if (returnsAfter) {
    return [result]
  }
  const ids = before.slice(0, SNAPSHOT_LIMIT).map(item => item._id)
  const filter = ids.length ? { _id: { $in: ids } } : query.getFilter()
  return captureQuery({ model: query.model, getFilter: () => filter })
}

const recordDocuments = (model, before, after, deleting) => {
  const previous = new Map(before.map(item => [String(item._id), item]))
  const documents = deleting ? before : after
  for (const doc of documents.slice(0, SNAPSHOT_LIMIT)) {
    const old = deleting ? doc : previous.get(String(doc._id))
    recordChange(
      model,
      deleting ? 'DELETED' : 'CHANGED',
      auditSnapshot(model, old),
      deleting ? null : auditSnapshot(model, doc)
    )
  }
}

const mutationCount = result => result.modifiedCount ?? result.deletedCount
const hasChanges = result =>
  Boolean(result.upsertedCount) || mutationCount(result) !== 0

const finishQuery = async function (result) {
  const state = queryState.get(this)
  if (!state || result === null) {
    return
  }
  const count = mutationCount(result)
  if (!hasChanges(result)) {
    return
  }
  const model = this.model.modelName
  const deleting = this.op.includes('Delete') || this.op.startsWith('delete')
  const before = state.before ?? []
  const after = deleting ? [] : await documentsAfter(this, result, before)
  recordDocuments(model, before, after ?? [], deleting)
  const incomplete =
    [state.before, after].includes(null) || count > SNAPSHOT_LIMIT
  if (incomplete) {
    recordAudit({
      eventType: 'change',
      action: `${model.toUpperCase()}_BATCH_CHANGED`,
      resourceType: model,
      outcome: 'success',
      metadata: {
        affected: count,
        snapshotLimit: SNAPSHOT_LIMIT,
        incomplete: true,
      },
    })
  }
}

const isolate = handler =>
  async function (...args) {
    try {
      await handler.apply(this, args)
    } catch {
      console.error('Audit observer failed')
    }
  }

// Installed before model compilation. It covers saves and ordinary Mongoose
// query mutations in controllers, helpers, jobs and contextualized scripts.
export const auditModel = (schema, modelName) => {
  if (!AUDIT_FIELDS[modelName]) {
    return
  }
  schema.post('init', function (doc) {
    if (auditContext()?.captureChanges) {
      documentState.set(doc, auditSnapshot(modelName, doc))
    }
  })
  schema.pre('save', function () {
    if (auditContext()?.captureChanges) {
      this.$locals.audit = {
        before: this.isNew ? null : documentState.get(this),
        operation: this.isNew ? 'CREATED' : 'CHANGED',
        authenticationChanged:
          modelName === 'User' && this.isModified('password'),
      }
    }
  })
  schema.post('save', function (doc) {
    const state = doc.$locals.audit
    if (!state) {
      return
    }
    const after = auditSnapshot(modelName, doc)
    recordChange(modelName, state.operation, state.before, after, {
      authenticationChanged: state.authenticationChanged,
    })
    delete doc.$locals.audit
    documentState.set(doc, after)
  })
  for (const operation of [
    'findOneAndUpdate',
    'updateOne',
    'updateMany',
    'replaceOne',
    'findOneAndDelete',
    'deleteOne',
    'deleteMany',
  ]) {
    schema.pre(operation, { query: true, document: false }, isolate(trackQuery))
    schema.post(
      operation,
      { query: true, document: false },
      isolate(finishQuery)
    )
  }
  schema.post('insertMany', function (documents) {
    if (!auditContext()?.captureChanges) {
      return
    }
    for (const doc of documents.slice(0, SNAPSHOT_LIMIT)) {
      recordChange(modelName, 'CREATED', null, auditSnapshot(modelName, doc))
    }
    if (auditContext()?.captureChanges && documents.length > SNAPSHOT_LIMIT) {
      recordAudit({
        eventType: 'change',
        action: `${modelName.toUpperCase()}_BATCH_CREATED`,
        resourceType: modelName,
        outcome: 'success',
        metadata: {
          affected: documents.length,
          snapshotLimit: SNAPSHOT_LIMIT,
          incomplete: true,
        },
      })
    }
  })
}
