import mongoose from 'mongoose'

const revenueRecordSchema = new mongoose.Schema(
  {
    venture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venture',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

const RevenueRecord = mongoose.model('RevenueRecord', revenueRecordSchema)

export default RevenueRecord
