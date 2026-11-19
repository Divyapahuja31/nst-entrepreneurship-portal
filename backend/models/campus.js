import { auditModel } from '../utils/auditModel.js'
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

auditModel(campusSchema, modelName)

const Campus = mongoose.model(modelName, campusSchema)

export default Campus
