import mongoose from 'mongoose'

const revenueRecordSchema = new mongoose.Schema({
  venture: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
})

const RevenueRecord = mongoose.model('RevenueRecord', revenueRecordSchema)

export default RevenueRecord
