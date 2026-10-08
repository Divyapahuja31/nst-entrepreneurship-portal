import mongoose from 'mongoose'
import { CYCLES } from '@nst/shared/biweeklyCycles.js'

// One bi-weekly check-in between a startup's mentor and its founders: an
// event with a Google Meet link on the mentor's calendar, to which every
// active founder is invited.
const attendeeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
  },
  { _id: false }
)

const checkInSchema = new mongoose.Schema(
  {
    venture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venture',
      required: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Set when this is one occurrence of a recurring check-in.
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CheckInSeries',
      default: null,
      index: true,
    },
    // The cycle the check-in falls in, from the startup's creation date.
    cycle_number: {
      type: Number,
      min: 1,
      max: CYCLES,
      default: null,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    // Where the series first put this occurrence. Google identifies an
    // occurrence by it, and ending a series cuts the recurrence there.
    originalStartAt: {
      type: Date,
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    timeZone: {
      type: String,
      required: true,
    },
    // The event, or the occurrence of the recurring event, on the mentor's
    // calendar.
    googleEventId: {
      type: String,
      required: true,
    },
    meetUrl: {
      type: String,
    },
    // The Meet code (abc-defg-hij). Every occurrence of a series shares it.
    meetingCode: {
      type: String,
    },
    // The startup's active founders when the event was last written.
    attendees: [attendeeSchema],
    status: {
      type: String,
      enum: ['SCHEDULED', 'CANCELLED', 'HELD', 'NOT_HELD'],
      default: 'SCHEDULED',
    },
    cancelledAt: {
      type: Date,
    },
  },
  { timestamps: true }
)

checkInSchema.index({ venture: 1, scheduledAt: 1 })
// A founder's check-ins, for their profile.
checkInSchema.index({ 'attendees.user': 1, scheduledAt: 1 })

export const modelName = 'CheckIn'

const CheckIn = mongoose.model(modelName, checkInSchema)

export default CheckIn
