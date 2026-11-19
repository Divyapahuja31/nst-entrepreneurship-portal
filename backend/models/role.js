import { auditModel } from '../utils/auditModel.js'
import mongoose from 'mongoose'

const roleSchema = new mongoose.Schema(
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

export const modelName = 'Role'

auditModel(roleSchema, modelName)

const Role = mongoose.model(modelName, roleSchema)

export default Role
