import mongoose from 'mongoose'

// A KPI the bot (utils/kpiBot.js) suggests for one founder from a meeting's
// transcript. It is not a KPI yet: the founder, the startup's mentors or the
// academic board accept it (it becomes the founder's draft KPI, with the
// same _id) or dismiss it.
const kpiRecommendationSchema = new mongoose.Schema(
  {
    // The bot sets it from the meeting, founder, quote and title, so a retry
    // never suggests the same goal twice.
    _id: {
      type: mongoose.Schema.Types.ObjectId,
    },
    venture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venture',
      required: true,
    },
    founder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    checkIn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CheckIn',
      required: true,
    },
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
    targetValue: {
      type: String,
      default: '',
    },
    dueDate: {
      type: Date,
    },
    // The transcript line it rests on, and the meeting's day (YYYY-MM-DD).
    quote: {
      type: String,
      default: '',
    },
    meetingDate: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DISMISSED'],
      default: 'PENDING',
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

kpiRecommendationSchema.index({ venture: 1, status: 1 })
kpiRecommendationSchema.index({ founder: 1, status: 1 })

export const modelName = 'KpiRecommendation'

const KpiRecommendation = mongoose.model(modelName, kpiRecommendationSchema)

export default KpiRecommendation
