import mongoose from 'mongoose'

const kpiProofSchema = new mongoose.Schema(
  {
    kpi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KPI',
      required: true,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    file: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'],
      default: 'UNDER_REVIEW',
    },

    grade: {
      type: Number,
      min: 0,
      max: 10,
    },

    feedback: {
      type: String,
      trim: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

export const modelName = 'KPIProof'

const KPIProof = mongoose.model(modelName, kpiProofSchema)

export default KPIProof
