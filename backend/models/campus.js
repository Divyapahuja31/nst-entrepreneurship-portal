import mongoose from 'mongoose'

const campusSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    location: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export const modelName = 'Campus'

const Campus = mongoose.model(modelName, campusSchema)

export default Campus
