import mongoose from 'mongoose'
import {
  evaluationStatus,
  evaluationTotal,
} from '@nst/shared/evaluationScore.js'

const biWeeklyEvaluationSchema = new mongoose.Schema(
  {
    checklist_id: {
      type: Number,
      required: true,
      min: 1,
      max: 13,
    },
    month_number: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
    },
    execution_score: { type: Number, default: 0, min: 0, max: 100 },
    customer_score: { type: Number, default: 0, min: 0, max: 100 },
    business_score: { type: Number, default: 0, min: 0, max: 100 },
    behavior_score: { type: Number, default: 0, min: 0, max: 100 },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Out of 100, weighted as on the Methodology page (shared/evaluationScore).
biWeeklyEvaluationSchema.virtual('total_score').get(function () {
  return Math.round(evaluationTotal(this))
})

biWeeklyEvaluationSchema.virtual('status').get(function () {
  return evaluationStatus(this)
})

export const modelName = 'BiWeeklyEvaluation'
const Evaluation = mongoose.model(modelName, biWeeklyEvaluationSchema)

export default Evaluation
