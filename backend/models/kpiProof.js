import mongoose from 'mongoose'

const kpiProofSchema = new mongoose.Schema(
  {
    keyPerformanceInsight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KPI',
      required: true,
    },
    file: {
      type: String,
      required: true,
    },
    body: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

export const modelName = 'KPIProof'

const KPIProof = mongoose.model(modelName, kpiProofSchema)

export default KPIProof
