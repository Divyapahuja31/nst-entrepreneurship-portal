import mongoose from 'mongoose'
import KPIStatus from './enums/KPIStatus.js'
import KPIScope from './enums/KPIScope.js'

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
    // A KPI either belongs to the venture as a whole or to one of its
    // founders. Either way it is scoped to a venture, so venture-level
    // reporting never has to special-case founder KPIs.
    scope: {
      type: String,
      enum: Object.keys(KPIScope),
      default: 'VENTURE',
      required: true,
    },

    venture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venture',
      required: true,
    },

    // Set only for FOUNDER-scoped KPIs.
    founder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

// Keeps the two fields from contradicting each other: a founder KPI must name
// its founder, and a venture KPI must not.
kpiSchema.pre('validate', function () {
  if (this.scope === 'FOUNDER' && !this.founder) {
    this.invalidate('founder', 'A founder KPI must have a founder')
  }

  if (this.scope === 'VENTURE') {
    this.founder = null
  }
})

kpiSchema.index({ venture: 1, scope: 1 })
kpiSchema.index({ founder: 1 })

export const modelName = 'KPI'

const KPI = mongoose.model(modelName, kpiSchema)

export default KPI
