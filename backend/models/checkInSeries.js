import mongoose from 'mongoose'

// A recurring check-in: one Google Calendar event repeating every two weeks
// through the startup's last cycle. Each occurrence is its own CheckIn, so it
// can be moved or cancelled alone.
const checkInSeriesSchema = new mongoose.Schema(
  {
    venture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venture',
      required: true,
      index: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The recurring event on the mentor's calendar.
    googleEventId: {
      type: String,
      required: true,
    },
    startAt: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    timeZone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ENDED'],
      default: 'ACTIVE',
    },
    endedAt: {
      type: Date,
    },
  },
  { timestamps: true }
)

export const modelName = 'CheckInSeries'

const CheckInSeries = mongoose.model(modelName, checkInSeriesSchema)

export default CheckInSeries
