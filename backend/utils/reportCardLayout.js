import { Schema } from 'mongoose'

const assessment = new Schema(
  { id: String, name: String, max: Number, showAverage: Boolean },
  { _id: false }
)
const term = new Schema(
  { id: String, name: String, assessments: [assessment] },
  { _id: false }
)

const subject = new Schema({ name: String, max: Number }, { _id: false })

export default new Schema(
  {
    mode: { type: String, enum: ['numeric', 'letter'] },
    terms: [term],
    subjects: { type: [subject], default: undefined },
    legend: { A: String, B: String, C: String, D: String },
  },
  { _id: false }
)
