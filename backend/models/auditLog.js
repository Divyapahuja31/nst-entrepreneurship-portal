import mongoose from 'mongoose'

export const AUDIT_ACTIONS = Object.freeze([
  'ROLE_CHANGED',
  'ACCOUNT_CREATED',
  'ACCOUNT_DEACTIVATED',
])

// Who did it and to whom. Emails are copied in rather than referenced so an
// entry stays readable after the account is deactivated.
const partySchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    email: { type: String, required: true },
  },
  { _id: false }
)

// A record of account and role changes, readable only by admins. Entries
// are only ever added.
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
    },
    // null when run from the command line (scripts/make-admin.js).
    actor: { type: partySchema, default: null },
    target: { type: partySchema, required: true },
    previousRole: { type: String, default: null },
    newRole: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

auditLogSchema.index({ createdAt: -1 })

export const modelName = 'AuditLog'

const AuditLog = mongoose.model(modelName, auditLogSchema)

export default AuditLog
