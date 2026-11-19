import mongoose from 'mongoose'
import AuditLog from '../models/auditLog.js'
import { auditContext } from './auditContext.js'
import { auditFingerprint, sanitizeAudit } from './auditSanitize.js'
import { createAuditWriter } from './auditWriter.js'

const writer = createAuditWriter({
  write: async records => {
    try {
      await AuditLog.collection.insertMany(records, {
        ordered: false,
        timeoutMS: 3000,
      })
    } catch (error) {
      // A retry can see IDs inserted by the previous, partially completed batch.
      if (
        !error.writeErrors?.length ||
        error.writeErrors.some(item => item.code !== 11000)
      ) {
        throw error
      }
    }
  },
})

const enqueueAudit = fields => {
  const context = auditContext()
  if (!context) {
    return
  }
  const retention = Number(process.env.AUDIT_RETENTION_DAYS)
  const createdAt = new Date()
  writer.enqueue({
    _id: new mongoose.Types.ObjectId(),
    ...sanitizeAudit({
      action: fields.action,
      eventType: fields.eventType,
      resourceType: fields.resourceType,
      resourceId: fields.resourceId,
      ventureId: fields.ventureId,
      studentId: fields.studentId,
      cycle: fields.cycle,
      outcome: fields.outcome,
      target: fields.target,
      previousRole: fields.previousRole,
      newRole: fields.newRole,
    }),
    before: sanitizeAudit(fields.before),
    after: sanitizeAudit(fields.after),
    metadata: sanitizeAudit(fields.metadata),
    actor: fields.actor ? sanitizeAudit(fields.actor) : (context.actor ?? null),
    source: context.source,
    job: context.job,
    instance: String(process.env.HOSTNAME ?? `process-${process.pid}`).slice(
      0,
      80
    ),
    requestId: context.requestId,
    sequence: ++context.sequence,
    createdAt,
    ...(Number.isInteger(retention) &&
      retention > 0 &&
      retention <= 3650 && {
        expiresAt: new Date(createdAt.getTime() + retention * 86400000),
      }),
  })
}

export const recordAudit = fields => {
  try {
    enqueueAudit(fields)
  } catch {
    console.error('Audit event could not be queued')
  }
}

export const noteAuditIdentity = (email, googleId) => {
  const context = auditContext()
  if (context) {
    context.identity = {
      emailFingerprint: auditFingerprint(email),
      googleFingerprint: auditFingerprint(googleId),
    }
  }
}

export const flushAudit = () => writer.flush()
export const auditWriterStats = () => writer.stats()
