import mongoose from 'mongoose'
import startupStage from './enums/startupStage.js'

const ventureSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    founders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: true,
    },
    description: {
      type: String,
    },
    stage: {
      type: String,
      enum: Object.keys(startupStage),
      default: 'IDEATION',
    },
    industry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Industry',
      required: true,
    },
    website: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

ventureSchema.virtual('teamSize').get(function () {
  return this.founders.length
})

export const modelName = 'Venture'

const Venture = mongoose.model(modelName, ventureSchema)

export default Venture
