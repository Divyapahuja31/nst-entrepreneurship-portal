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
    submissionDate: {
      type: Date,
      default: null,
    },
    evaluationDate: {
      type: Date,
      default: null,
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    feedback: {
      type: String,
      default: '',
    },
    targetValue: {
      type: String,
      default: '',
    },
    actualValue: {
      type: String,
      default: '',
    },
    evidence: {
      supportingText: {
        type: String,
        default: '',
      },
      fileName: {
        type: String,
        default: '',
      },
      fileUrl: {
        type: String,
        default: '',
      },
      submittedAt: {
        type: Date,
        default: null,
      },
      uploadedAt: {
        type: Date,
        default: null,
      },
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
  },
  {
    timestamps: true,
  }
)

export const modelName = 'KPI'

const KPI = mongoose.model(modelName, kpiSchema)

export default KPI
