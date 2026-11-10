import mongoose from 'mongoose'

// The admin whose Google Calendar holds every programme session, bi-weekly
// and extra. There is a single document (key "host"). The first admin to
// connect Google from the Programme or Extra Sessions page becomes it, and
// another takes over once the host's connection is gone.
const calendarHostSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'host',
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
)

export const modelName = 'CalendarHost'

const CalendarHost = mongoose.model(modelName, calendarHostSchema)

export default CalendarHost
