import mongoose from 'mongoose'

const notificationTriggerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    eventType: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
)

const NotificationTrigger = mongoose.model(
  'NotificationTrigger',
  notificationTriggerSchema
)

export default NotificationTrigger
