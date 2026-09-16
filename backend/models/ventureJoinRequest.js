import mongoose from 'mongoose'

import ventureJoinRequestStatus from './enums/ventureJoinRequestStatus.js'

const ventureJoinRequestSchema = new mongoose.Schema(
  {
    venture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venture',
      required: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    message: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.keys(ventureJoinRequestStatus),
      default: 'PENDING',
      required: true,
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

ventureJoinRequestSchema.index({ venture: 1, requestedBy: 1 }, { unique: true })

export const modelName = 'VentureJoinRequest'

const VentureJoinRequest = mongoose.model(modelName, ventureJoinRequestSchema)

export default VentureJoinRequest
