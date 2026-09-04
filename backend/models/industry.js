import mongoose from 'mongoose'

const IndustrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

export const modelName = 'Industry'

const Industry = mongoose.model(modelName, IndustrySchema)

export default Industry
