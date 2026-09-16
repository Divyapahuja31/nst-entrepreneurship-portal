import mongoose from 'mongoose'

import founderStatus from './enums/founderStatus.js'

const founderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    venture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venture',
      required: true,
    },

    status: {
      type: String,
      enum: Object.keys(founderStatus),
      default: 'ACTIVE',
      required: true,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    leftAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

// One membership record per user per venture, so rejoining reuses the record.
founderSchema.index({ user: 1, venture: 1 }, { unique: true })

// A user can be an active founder of only one venture at a time, but may hold any number of inactive memberships.
founderSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
)

founderSchema.index({ venture: 1, status: 1 })

export const modelName = 'Founder'

const Founder = mongoose.model(modelName, founderSchema)

export default Founder
