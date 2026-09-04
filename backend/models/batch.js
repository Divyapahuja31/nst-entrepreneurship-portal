import mongoose from 'mongoose'

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    startYear: {
      type: Number,
      required: true,
    },
    endYear: {
      type: Number,
      required: true,
    },
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

export const modelName = 'Batch'

const Batch = mongoose.model(modelName, batchSchema)

export default Batch
