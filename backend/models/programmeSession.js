import mongoose from 'mongoose'

// One bi-weekly session of the programme. Its meetings are CheckIns with
// `session` set, created when the session is scheduled (utils/
// programmeScheduler.js), a few days before it.
const programmeSessionSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      unique: true,
    },
    cycle_number: {
      type: Number,
      default: null,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    // PLANNED: only a date so far. SCHEDULED: its meetings are on the
    // calendars. CANCELLED: by an admin.
    status: {
      type: String,
      enum: ['PLANNED', 'SCHEDULED', 'CANCELLED'],
      default: 'PLANNED',
    },
    scheduledAt: {
      type: Date,
    },
    // Why it couldn't be scheduled, shown to the admin.
    problem: {
      type: String,
      default: null,
    },
    // While one job schedules it, another leaves it alone.
    claimedUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

export const modelName = 'ProgrammeSession'

const ProgrammeSession = mongoose.model(modelName, programmeSessionSchema)

export default ProgrammeSession
