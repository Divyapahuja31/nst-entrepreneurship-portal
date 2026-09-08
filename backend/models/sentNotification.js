import mongoose from 'mongoose'

const sentNotificationSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
    },
    isSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

const SentNotification = mongoose.model(
  'SentNotification',
  sentNotificationSchema
)

export default SentNotification
