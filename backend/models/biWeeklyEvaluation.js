import mongoose from 'mongoose'

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
    execution_score: { type: Number, default: 0, min: 0 },
    customer_score: { type: Number, default: 0, min: 0 },
    business_score: { type: Number, default: 0, min: 0 },
    behavior_score: { type: Number, default: 0, min: 0 },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

biWeeklyEvaluationSchema.virtual('total_score').get(function () {
  return (
    (this.execution_score || 0) +
    (this.customer_score || 0) +
    (this.business_score || 0) +
    (this.behavior_score || 0)
  )
})

biWeeklyEvaluationSchema.virtual('status').get(function () {
  const score = this.total_score
  if (score >= 75) {
    return 'green'
  }
  if (score >= 50) {
    return 'yellow'
  }
  return 'red'
})

export const modelName = 'BiWeeklyEvaluation'
const Evaluation = mongoose.model(modelName, biWeeklyEvaluationSchema)

export default Evaluation
