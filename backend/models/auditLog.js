import mongoose from 'mongoose'
import { sanitizeAudit } from '../utils/auditSanitize.js'

export const AUDIT_ACTIONS = Object.freeze([
  'ROLE_CHANGED',
  'ACCOUNT_CREATED',
  'ACCOUNT_DEACTIVATED',
])

export const AUDIT_EVENT_TYPES = Object.freeze(['request', 'change', 'system'])
export const AUDIT_OUTCOMES = Object.freeze([
  'success',
  'denied',
  'failed',
  'partial',
])

// Legacy account entries retain their email labels. New events identify
// actors by account ID and role and hash unauthenticated identity attempts.
const partySchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.Mixed, required: true },
    email: String,
    role: String,
  },
  { _id: false }
)

// Both legacy account entries and portal-wide history, readable by admins.
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    // null when run from the command line (scripts/make-admin.js).
    actor: { type: partySchema, default: null },
    target: { type: partySchema, default: undefined },
    previousRole: { type: String, default: null },
    newRole: { type: String, default: null },
    eventType: { type: String, enum: AUDIT_EVENT_TYPES },
    resourceType: String,
    resourceId: String,
    ventureId: String,
    studentId: String,
    cycle: Number,
    outcome: { type: String, enum: AUDIT_OUTCOMES },
    source: String,
    job: String,
    instance: String,
    requestId: String,
    sequence: Number,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,
    expiresAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

auditLogSchema.index({ createdAt: -1, _id: -1 })
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 })
auditLogSchema.index({ ventureId: 1, cycle: 1, createdAt: -1 })
auditLogSchema.index({ studentId: 1, createdAt: -1 })
auditLogSchema.index({ requestId: 1, sequence: 1 })
auditLogSchema.index({ 'actor.id': 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ 'metadata.emailFingerprint': 1, createdAt: -1 })
auditLogSchema.index({ 'after.emailFingerprint': 1, createdAt: -1 })
auditLogSchema.index({ 'before.emailFingerprint': 1, createdAt: -1 })
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

auditLogSchema.pre('save', function () {
  if (!this.isNew) {
    throw new Error('Audit records are append-only')
  }
  for (const field of ['before', 'after', 'metadata']) {
    if (this[field] !== undefined) {
      this[field] = sanitizeAudit(this[field])
    }
  }
})
for (const operation of [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
  'bulkWrite',
]) {
  auditLogSchema.pre(operation, function () {
    throw new Error('Audit records are append-only')
  })
}
auditLogSchema.pre('deleteOne', { document: true, query: false }, function () {
  throw new Error('Audit records are append-only')
})

export const modelName = 'AuditLog'

const AuditLog = mongoose.model(modelName, auditLogSchema)

export default AuditLog
