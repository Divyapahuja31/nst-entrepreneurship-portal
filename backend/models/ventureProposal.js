import mongoose from 'mongoose'

import startupStage from './enums/startupStage.js'
import VentureProposalStatus from './enums/VentureProposalStatus.js'

const proposalReviewSchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    status: {
      type: String,
      enum: ['REJECTED', 'APPROVED'],
      required: true,
    },

    remarks: {
      type: String,
      trim: true,
    },

    reviewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
)

const ventureProposalSchema = new mongoose.Schema(
  {
    // Step 1

    startupName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    targetCustomer: {
      type: String,
      required: true,
      trim: true,
    },

    industry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Industry',
    },

    industryName: {
      type: String,
      trim: true,
    },

    // Step 2

    stage: {
      type: String,
      enum: Object.keys(startupStage),
      required: true,
    },

    currentTraction: {
      type: String,
      required: true,
      trim: true,
    },

    businessModel: {
      type: String,
      required: true,
      trim: true,
    },

    // Step 3

    assumptions: {
      type: [String],
      required: true,
    },

    risks: {
      type: [String],
      required: true,
    },

    sixMonthGoals: {
      type: String,
      required: true,
      trim: true,
    },

    // Step 4

    techStack: {
      type: String,
      required: true,
      trim: true,
    },

    capitalStatus: {
      type: String,
      required: true,
      trim: true,
    },

    weeklyHours: {
      type: Number,
      required: true,
      min: 0,
    },

    website: {
      type: String,
      trim: true,
    },

    // Ownership

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: true,
    },

    // Proposal lifecycle

    status: {
      type: String,
      enum: Object.keys(VentureProposalStatus),
      default: 'PENDING',
      required: true,
    },

    // Review history

    reviews: {
      type: [proposalReviewSchema],
      default: [],
    },

    // Created when proposal is approved

    venture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venture',
    },
  },
  {
    timestamps: true,
  }
)

export const modelName = 'VentureProposal'

const VentureProposal = mongoose.model(modelName, ventureProposalSchema)

export default VentureProposal
