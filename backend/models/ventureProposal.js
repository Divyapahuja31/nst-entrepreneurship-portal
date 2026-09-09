import mongoose from 'mongoose'
import startupStage from './enums/startupStage.js'

const ventureProposalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    stage: {
      type: String,
      enum: Object.keys(startupStage),
      default: 'IDEATION',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

export const modelName = 'VentureProposal'

const VentureProposal = mongoose.model(modelName, ventureProposalSchema)

export default VentureProposal
