import mongoose from 'mongoose'
import { auditModel } from '../utils/auditModel.js'
const schema = new mongoose.Schema(
  {
    venture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venture',
      unique: true,
      required: true,
    },
    revision: { type: Number, required: true },
    definition: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
)
auditModel(schema, 'BiweeklyForm')
export default mongoose.model('BiweeklyForm', schema)
