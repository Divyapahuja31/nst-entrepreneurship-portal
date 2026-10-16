import mongoose from 'mongoose'

// An extra session's own settings, for one day. Everything else (the host,
// the time zone) comes from the programme.
const extraSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
    mode: {
      type: String,
      enum: ['GROUP', 'SLOTS'],
      default: 'SLOTS',
    },
    slotMinutes: { type: Number, default: 15 },
    gapMinutes: { type: Number, default: 0 },
    firstGapMinutes: { type: Number, default: 0 },
    staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    excludedVentures: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Venture' },
    ],
    excludedFounders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
)

// One session of the programme: one of the 13 bi-weekly sessions (with a
// number), or an extra one an admin or the board adds on any day (with
// `extra` and no number). Its meetings are CheckIns with `session` set,
// created when the session is scheduled (utils/programmeScheduler.js).
const programmeSessionSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
    },
    extra: {
      type: extraSchema,
      default: undefined,
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

// Numbers are unique among the bi-weekly sessions; extra ones have none.
programmeSessionSchema.index(
  { number: 1 },
  { unique: true, partialFilterExpression: { number: { $type: 'number' } } }
)

// The bi-weekly sessions, leaving out extra ones.
export const REGULAR = { extra: null }

export const modelName = 'ProgrammeSession'

const ProgrammeSession = mongoose.model(modelName, programmeSessionSchema)

export default ProgrammeSession
