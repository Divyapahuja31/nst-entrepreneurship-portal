import mongoose from 'mongoose'
import KPIStatus from './enums/KPIStatus.js'

const kpiSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    dueDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: Object.keys(KPIStatus),
      default: 'DRAFT',
    },
    score: {
      type: Number,
      default: 0,
    },
    venture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venture',
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    subKPIs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubKPI',
      },
    ],

    evidence: {
      fileUrl: { type: String, default: '' },
      fileName: { type: String, default: '' },
      supportingText: { type: String, default: '' },
      uploadedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
)

export const modelName = 'KPI'

const KPI = mongoose.model(modelName, kpiSchema)

export default KPI
