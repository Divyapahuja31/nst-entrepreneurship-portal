import mongoose from 'mongoose'

import KPIStatus from './enums/KPIStatus.js'

const kpiSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.keys(KPIStatus),
      default: 'DRAFT',
    },
  },
  {
    timestamps: true,
  }
)

export const modelName = 'KPI'

const KPI = mongoose.model(modelName, kpiSchema)

export default KPI
