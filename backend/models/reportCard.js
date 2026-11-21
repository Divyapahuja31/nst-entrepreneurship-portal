import { auditModel } from '../utils/auditModel.js'
import mongoose from 'mongoose'
import layoutSchema from '../utils/reportCardLayout.js'

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    columns: { type: [String], required: true },
    layout: { type: layoutSchema, default: undefined },
    rows: { type: [[String]], required: true },
  },
  { _id: false }
)

const publicationSchema = new mongoose.Schema(
  {
    ...contentSchema.obj,
    publishedAt: { type: Date, required: true },
  },
  { _id: false }
)

const schema = new mongoose.Schema(
  {
    // The student account ID is the report ID, so concurrent creates cannot
    // make duplicate cards for a student.
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    draft: { type: contentSchema, required: true },
    published: { type: publicationSchema, default: null },
    // Private grading notes, separate from the published report.
    observation: { type: String },
    revision: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const modelName = 'ReportCard'
auditModel(schema, modelName)

export default mongoose.model(modelName, schema)
