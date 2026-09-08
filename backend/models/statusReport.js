import mongoose from 'mongoose'
import startupStage from './enums/startupStage.js'
const statusReportSchema = new mongoose.Schema(
  {
    venture: {
      type: String,
      required: true,
    },
    submittedBy: {
      type: String,
      required: true,
    },
    stage: {
      type: String,
      enum: Object.keys(startupStage),
      required: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

const StatusReport = mongoose.model('StatusReport', statusReportSchema)

export default StatusReport
