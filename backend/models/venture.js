import mongoose from 'mongoose'

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
    website: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

export const modelName = 'Venture'

const Venture = mongoose.model(modelName, ventureSchema)

export default Venture
