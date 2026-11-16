import mongoose from 'mongoose'
import { auditModel } from '../utils/auditModel.js'

const subKPISchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    parentKPI: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KPI',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

auditModel(subKPISchema, 'SubKPI')
const SubKPI = mongoose.models.SubKPI || mongoose.model('SubKPI', subKPISchema)

export default SubKPI
