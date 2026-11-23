import mongoose from 'mongoose'
import { auditModel } from '../utils/auditModel.js'
import { MAX_GUIDANCE_LENGTH } from '../utils/kpiBotPrompt.js'

const schema = new mongoose.Schema(
  {
    _id: { type: String, default: 'default' },
    guidance: { type: String, required: true, maxLength: MAX_GUIDANCE_LENGTH },
    revision: { type: Number, default: 0, min: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

auditModel(schema, 'KpiBotSettings')

export default mongoose.model('KpiBotSettings', schema)
