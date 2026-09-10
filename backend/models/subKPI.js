import mongoose from 'mongoose'

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

const SubKPI = mongoose.models.SubKPI || mongoose.model('SubKPI', subKPISchema)

export default SubKPI
