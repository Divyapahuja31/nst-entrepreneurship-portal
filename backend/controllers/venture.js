import mongoose from 'mongoose'

import Founder from '../models/founder.js'
import Venture from '../models/venture.js'
import VentureJoinRequest from '../models/ventureJoinRequest.js'
import { findVentureForUser } from '../utils/founderHelper.js'

export const getVentures = async (req, res) => {
  try {
    const data = await Venture.find({})
      .select('_id name campus stage industry')
      .populate([
        { path: 'campus', select: 'name' },
        { path: 'industry', select: 'name' },
        { path: 'founders', populate: { path: 'user', select: 'username' } },
      ])

    const venture = data.map(data => {
      const founders = data.founders
        .map(founder => founder.user)
        .filter(Boolean)

      return {
        id: data._id,
        name: data.name,
        campus: data.campus?.name || '-',
        stage: data.stage,
        industry: data.industry?.name || '-',
        founders: founders.map(founder => founder.username).join(', ') || '-',
        team: founders.length,
      }
    })

    return res.status(200).json(venture)
  } catch (error) {
    console.error('Error fetching venture:', error)

    return res.status(500).json({
      error: 'Could not fetch venture',
    })
  }
}

export const getVentureById = async (req, res) => {
  try {
    const { ventureId } = req.params

    if (!mongoose.isValidObjectId(ventureId)) {
      return res.status(400).json({ error: 'Valid ventureId is required' })
    }

    const venture = await Venture.findById(ventureId)
      .populate([
        { path: 'campus', select: 'name' },
        { path: 'industry', select: 'name' },
      ])
      .populate({
        path: 'founders',
        populate: { path: 'user', select: 'username email' },
      })

    if (!venture) {
      return res.status(404).json({ error: 'Venture not found' })
    }

    const pastFounders = await Founder.find({
      venture: ventureId,
      status: 'INACTIVE',
    }).populate('user', 'username email')

    return res.status(200).json({
      venture: {
        id: venture._id,
        name: venture.name,
        description: venture.description || null,
        campus: venture.campus?.name || null,
        industry: venture.industry?.name || null,
        stage: venture.stage,
        website: venture.website || null,
        createdAt: venture.createdAt,
      },
      founders: venture.founders
        .filter(founder => founder.user)
        .map(founder => ({
          id: founder.user._id,
          username: founder.user.username,
          email: founder.user.email,
          joinedAt: founder.joinedAt,
        })),
      pastFounders: pastFounders
        .filter(founder => founder.user)
        .map(founder => ({
          id: founder.user._id,
          username: founder.user.username,
          email: founder.user.email,
          joinedAt: founder.joinedAt,
          leftAt: founder.leftAt,
        })),
    })
  } catch (error) {
    console.error('Error fetching venture:', error)

    return res.status(500).json({
      error: 'Could not fetch venture',
    })
  }
}

export const getMyJoinRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const joinRequest = await VentureJoinRequest.findOne({
      requestedBy: req.user.id,
    })
      .sort({ createdAt: -1 })
      .populate('venture', 'name')

    return res.status(200).json({
      joinRequest: joinRequest || null,
    })
  } catch (error) {
    console.error('Error fetching join request:', error)

    return res.status(500).json({
      error: 'Could not fetch join request',
    })
  }
}

export const createJoinRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { ventureId } = req.params
    const { message } = req.body

    const venture = await Venture.findById(ventureId)
    if (!venture) {
      return res.status(404).json({ error: 'Venture not found' })
    }

    const currentVenture = await findVentureForUser(req.user.id)
    if (currentVenture) {
      return res.status(409).json({
        error: 'You are already part of a venture',
      })
    }

    const existingRequest = await VentureJoinRequest.findOne({
      requestedBy: req.user.id,
      status: 'PENDING',
    })

    if (existingRequest) {
      return res.status(409).json({
        error: 'You already have a pending request to join a venture',
      })
    }

    const joinRequest = await VentureJoinRequest.findOneAndUpdate(
      { venture: ventureId, requestedBy: req.user.id },
      {
        venture: ventureId,
        requestedBy: req.user.id,
        message,
        status: 'PENDING',
        $unset: { reviewedBy: '', reviewedAt: '' },
      },
      { returnDocument: 'after', upsert: true }
    ).populate('venture', 'name')

    return res.status(201).json({ joinRequest })
  } catch (error) {
    console.error('Error creating join request:', error)

    return res.status(500).json({
      error: 'Could not submit join request',
    })
  }
}
