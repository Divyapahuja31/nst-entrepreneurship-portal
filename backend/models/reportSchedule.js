import mongoose from 'mongoose'

// When the bi-weekly reports start, set by an admin apart from the
// programme's meetings: cycle 1 of every startup's reports opens at midnight
// of startDate in timeZone. There is a single document (key "reports").
const reportScheduleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'reports',
      unique: true,
    },
    // The day cycle 1 starts, in timeZone (YYYY-MM-DD).
    startDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    timeZone: {
      type: String,
      default: 'Asia/Kolkata',
    },
  },
  { timestamps: true }
)

export const modelName = 'ReportSchedule'

const ReportSchedule = mongoose.model(modelName, reportScheduleSchema)

export default ReportSchedule
