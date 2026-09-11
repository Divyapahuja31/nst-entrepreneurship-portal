import mongoose from 'mongoose'

const biWeeklyObservationSchema = new mongoose.Schema(
  {
    cycle_number: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    author_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    observation: {
      type: String,
      default: '',
      trim: true,
    },
    strengths: {
      type: String,
      default: '',
      trim: true,
    },
    concerns: {
      type: String,
      default: '',
      trim: true,
    },
    action_items: {
      type: String,
      default: '',
      trim: true,
    },
    evidence_reviewed: [
      {
        type: Number,
      },
    ],
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
)

const Observation = mongoose.model(
  'BiWeeklyObservationSchema',
  biWeeklyObservationSchema
)

export default Observation
