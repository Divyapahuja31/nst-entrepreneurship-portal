import mongoose from 'mongoose'

const subKPISchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    parentKPI: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KPI',
      required: true,
    },
  },
  { timestamps: true }
)

const SubKPI = mongoose.model('SubKPI', subKPISchema)

export default SubKPI
