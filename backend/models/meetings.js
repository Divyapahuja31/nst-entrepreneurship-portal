import mongoose from 'mongoose'
import meetingStatus from './enums/meetingStatus'

const meetingsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    scheduledAt: {
      type: Date,
      required: true,
    },
    meetingDuration: {
      type: Number,
      required: true,
    },
    meet_url: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.keys(meetingStatus),
      default: 'Not Started',
    },
    venture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venture',
    },
  },
  {
    timestamps: true,
  }
)

export const modelName = 'Meeting'

const Meeting = mongoose.model(modelName, meetingsSchema)

export default Meeting
