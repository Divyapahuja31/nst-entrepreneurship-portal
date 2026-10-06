import mongoose from 'mongoose'
import emailNotificationType from './enums/emailNotificationType.js'
import emailNotificationStatus from './enums/emailNotificationStatus.js'

// One row per email the portal tries to send, written by the server only.
// Admins read every row and everyone else only their own (see
// controllers/notification.js).
const emailNotificationSchema = new mongoose.Schema(
  {
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // Accounts are deactivated, never deleted, so this keeps resolving.
    recipientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: Object.keys(emailNotificationType),
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.keys(emailNotificationStatus),
      default: 'PENDING',
      required: true,
    },
    provider: {
      type: String,
      default: 'resend',
    },
    providerMessageId: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    // What the email is about, e.g. `kpi:<id>`. A recipient gets at most one
    // sent email of a type per key; failed and pending rows don't count, so
    // a failed send can be retried.
    dedupeKey: {
      type: String,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

emailNotificationSchema.index(
  { recipientEmail: 1, type: 1, dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'SENT',
      dedupeKey: { $type: 'string' },
    },
  }
)
emailNotificationSchema.index({ createdAt: -1 })

export const modelName = 'EmailNotification'

const EmailNotification = mongoose.model(modelName, emailNotificationSchema)

export default EmailNotification
