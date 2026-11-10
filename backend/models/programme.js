import mongoose from 'mongoose'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

// The programme's one calendar, set by an admin: when the bi-weekly cycles
// start, when the sessions run, who runs them and who is invited. There is
// a single document (key "programme").
const programmeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'programme',
      unique: true,
    },
    // The day cycle 1 starts, in timeZone (YYYY-MM-DD).
    startDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    // 0 is Sunday; 4 is Thursday.
    weekday: {
      type: Number,
      min: 0,
      max: 6,
      default: 4,
    },
    startTime: {
      type: String,
      match: TIME,
      default: '18:00',
    },
    endTime: {
      type: String,
      match: TIME,
      default: '20:00',
    },
    timeZone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    // GROUP: one meeting for everyone. SLOTS: each startup meets one staff
    // member in its own slot, the staff in parallel.
    mode: {
      type: String,
      enum: ['GROUP', 'SLOTS'],
      default: 'SLOTS',
    },
    // Who runs the sessions: any active staff account. Assignment to a
    // startup doesn't matter here.
    staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Everyone with an active startup is invited unless removed here, so
    // new startups and founders join automatically.
    excludedVentures: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Venture' },
    ],
    excludedFounders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    slotMinutes: {
      type: Number,
      default: 15,
    },
    gapMinutes: {
      type: Number,
      default: 0,
    },
    firstGapMinutes: {
      type: Number,
      default: 0,
    },
    // How many days before a session its meetings are drawn and sent.
    leadDays: {
      type: Number,
      default: 7,
    },
    // The admin whose Google Calendar holds every session event.
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
)

export const modelName = 'Programme'

const Programme = mongoose.model(modelName, programmeSchema)

export default Programme
