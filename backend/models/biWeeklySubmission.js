import mongoose from 'mongoose'

const evidenceLinkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      default: '',
      trim: true,
    },
    check: {
      type: String,
      required: true,
      trim: true,
    },
    self_confirmed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
)

const biWeeklySubmissionSchema = new mongoose.Schema(
  {
    custom_id: {
      type: String,
      required: true,
      unique: true,
      alias: 'id',
    },
    cycle_number: {
      type: Number,
      required: true,
      index: true,
    },

    // A report belongs to the startup and is shared by its co-founders, as a
    // startup's KPIs are.
    venture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venture',
      required: true,
    },

    submitted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    submitted_at: {
      type: Date,
      default: null,
    },
    progress_summary: {
      type: String,
      default: '',
      trim: true,
    },
    wins: {
      type: String,
      default: '',
      trim: true,
    },
    blockers: {
      type: String,
      default: '',
      trim: true,
    },
    hours_worked: {
      type: Number,
      default: 0,
      min: 0,
    },
    customer_interviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    features_shipped: {
      type: Number,
      default: 0,
      min: 0,
    },
    revenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    users_acquired: {
      type: Number,
      default: 0,
      min: 0,
    },
    experiments_run: {
      type: Number,
      default: 0,
      min: 0,
    },
    mentor_meeting_date: {
      type: Date,
      default: null,
    },
    mentor_meeting_notes: {
      type: String,
      default: '',
      trim: true,
    },
    goals_next_cycle: {
      type: String,
      default: '',
      trim: true,
    },
    ask_for_help: {
      type: String,
      default: '',
      trim: true,
    },
    biWeeklyEvaluation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiWeeklyEvaluation',
    },
    biWeeklyObservationSchema: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiWeeklyObservation',
    },
    evidence_links: [evidenceLinkSchema],
  },
  {
    timestamps: true,
  }
)

// One report per startup per cycle.
biWeeklySubmissionSchema.index(
  { venture: 1, cycle_number: 1 },
  { unique: true }
)

export const modelName = 'BiWeeklySubmission'
const BiWeeklySubmission = mongoose.model(modelName, biWeeklySubmissionSchema)

export default BiWeeklySubmission
