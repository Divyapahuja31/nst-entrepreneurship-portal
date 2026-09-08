import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

const AuditLog = mongoose.model('AuditLog', auditLogSchema)

export default AuditLog
