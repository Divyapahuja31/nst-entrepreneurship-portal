import mongoose from 'mongoose'
import layoutSchema from '../utils/reportCardLayout.js'

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    columns: { type: [String], required: true },
    layout: { type: layoutSchema, default: undefined },
  },
  { timestamps: true }
)

export const modelName = 'ReportCardTemplate'
export default mongoose.model(modelName, schema)
