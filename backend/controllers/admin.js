import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'

import Venture from '../models/venture.js'
import Campus from '../models/campus.js'
import Batch from '../models/batch.js'
import Industry from '../models/industry.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import KpiModel from '../models/kpi.js'
import startupStage from '../models/enums/startupStage.js'
import ventureHealth from '../models/enums/ventureHealth.js'
import { validateEmail, validateName } from '../utils/validator.js'

const SCORE_ON_TRACK = 70
const SCORE_WATCH = 40

const deriveStatus = score => {
  if (score === null || score === undefined) {
    return ventureHealth.NO_REVIEWS
  }
  if (score >= SCORE_ON_TRACK) {
    return ventureHealth.ON_TRACK
  }
  if (score >= SCORE_WATCH) {
    return ventureHealth.WATCH
  }
  return ventureHealth.AT_RISK
}

const getFounders = async (_, res) => {
  try {
    const ventures = await Venture.find()
      .populate('founders', 'username')
      .populate('campus', 'name')
      .sort({ name: 1 })

    const campuses = await Campus.find().sort({ name: 1 })

    const students = ventures.flatMap(venture => {
      const score = Math.round(Math.random() * 100)

      return venture.founders.map(founder => ({
        founder: founder.username,
        startup: venture.name,
        campus: venture.campus?.name ?? null,
        stage: venture.stage,
        team: venture.teamSize,
        // TODO(kanishkranjan): replace this one kpi are add
        //hard coded for now
        score: score,
        status: deriveStatus(score),
      }))
    })

    return res.json({
      students,
      campus: campuses.map(campus => campus.name),
      stage: Object.values(startupStage),
      status: Object.values(ventureHealth),
    })
  } catch (err) {
    console.error('Get founders error:', err)

    return res.status(500).json({
      error: 'Failed to load founders',
    })
  }
}

const getFounderOptions = async (_, res) => {
  try {
    const [industries, batches] = await Promise.all([
      Industry.find().sort({ name: 1 }),
      Batch.find().populate('campus', 'name').sort({ name: 1 }),
    ])

    return res.json({
      industry: industries.map(industry => ({
        value: industry._id,
        label: industry.name,
      })),
      batch: batches.map(batch => ({
        value: batch._id,
        label: `${batch.name} — ${batch.campus?.name ?? 'Unknown campus'}`,
      })),
      stage: Object.entries(startupStage).map(([value, label]) => ({
        value,
        label,
      })),
    })
  } catch (err) {
    console.error('Get founder options error:', err)

    return res.status(500).json({
      error: 'Failed to load founder options',
    })
  }
}

const normalizeFounderPayload = body => ({
  founder: String(body.founder ?? '').trim(),
  email: String(body.email ?? '')
    .trim()
    .toLowerCase(),
  startup: String(body.startup ?? '').trim(),
  industry: body.industry,
  batch: body.batch,
  stage: body.stage,
})

const validateFounderPayload = payload => ({
  founder: validateName(payload.founder),
  email: validateEmail(payload.email),
  startup: payload.startup ? '' : 'Startup name is required',
  industry: mongoose.isValidObjectId(payload.industry)
    ? ''
    : 'Industry is required',
  batch: mongoose.isValidObjectId(payload.batch) ? '' : 'Batch is required',
  stage: Object.hasOwn(startupStage, payload.stage ?? '')
    ? ''
    : 'Stage is required',
})

const resolveFounderRefs = async ({ founder, email, industry, batch }) => {
  const [batchDoc, industryDoc, studentRole, existingUser] = await Promise.all([
    Batch.findById(batch),
    Industry.findById(industry),
    Role.findOne({ name: 'student' }),
    User.findOne({ $or: [{ email }, { username: founder }] }),
  ])

  if (!studentRole) {
    console.error('Student role does not exist in database')
    return { status: 500, error: 'Student role is not configured' }
  }
  if (!batchDoc) {
    return { status: 400, error: { batch: 'Batch does not exist' } }
  }
  if (!industryDoc) {
    return { status: 400, error: { industry: 'Industry does not exist' } }
  }
  if (existingUser) {
    const conflict =
      existingUser.email === email
        ? { email: 'An account already exists with this email' }
        : { founder: 'This founder name is already taken' }

    return { status: 409, error: conflict }
  }

  return { batchDoc, industryDoc, studentRole }
}

const createFounderAccount = async ({
  founder,
  email,
  startup,
  stage,
  batchDoc,
  industryDoc,
  studentRole,
}) => {
  const user = await User.create({
    username: founder,
    email,
    password: randomUUID(),
    role: studentRole._id,
    batch: batchDoc._id,
    campus: batchDoc.campus,
  })

  try {
    const venture = await Venture.create({
      name: startup,
      founders: [user._id],
      campus: batchDoc.campus,
      stage,
      industry: industryDoc._id,
    })

    return { user, venture }
  } catch (err) {
    await User.deleteOne({ _id: user._id })
    throw err
  }
}

const createFounder = async (req, res) => {
  const payload = normalizeFounderPayload(req.body ?? {})
  const error = validateFounderPayload(payload)

  if (Object.values(error).some(Boolean)) {
    return res.status(400).json({ error })
  }

  try {
    const refs = await resolveFounderRefs(payload)

    if (refs.error) {
      return res.status(refs.status).json({ error: refs.error })
    }

    const { user, venture } = await createFounderAccount({
      ...payload,
      ...refs,
    })

    return res.status(201).json({
      founder: user.username,
      email: user.email,
      startup: venture.name,
      stage: venture.stage,
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: { email: 'Email or founder name already in use' },
      })
    }

    console.error('Create founder error:', err)

    return res.status(500).json({
      error: 'Failed to create founder',
    })
  }
}

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

async function getMonthlyKPICounts({
  year = new Date().getFullYear(),
  timezone = 'UTC',
} = {}) {
  const startOfYear = new Date(Date.UTC(year, 0, 1))
  const endOfYear = new Date(Date.UTC(year + 1, 0, 1))

  const monthlyData = await KpiModel.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfYear, $lt: endOfYear },
      },
    },
    {
      $group: {
        _id: { $month: { date: '$createdAt', timezone } },
        count: { $sum: 1 },
      },
    },
  ])

  return monthlyData.reduce(
    (acc, { _id, _ }) => {
      const monthKey = MONTH_NAMES[_id - 1]
      if (monthKey) {
        acc[monthKey] = Math.round(Math.random() * 100)
      }
      return acc
    },
    Object.fromEntries(MONTH_NAMES.map(m => [m, 0]))
  )
}

const getOverview = async (_, res) => {
  try {
    const data = await Venture.find()
      .populate('founders', 'username')
      .populate('campus', 'name')
      .sort({ name: 1 })

    const kpi = await getMonthlyKPICounts()

    const overview = {
      founder: 18,
      onTrack: 12,
      watch: 4,
      atRisk: 2,
    }

    const result = data.reduce(
      (accumulate, currentValue) => {
        const campusKey = currentValue.campus.name ?? 'Unknown'
        const stageKey = currentValue.stage ?? 'Unknown'

        accumulate.campus[campusKey] = (accumulate.campus[campusKey] ?? 0) + 1
        accumulate.stage[stageKey] = (accumulate.stage[stageKey] ?? 0) + 1

        return accumulate
      },
      { campus: {}, stage: {} }
    )
    return res.json({ result, kpi, overview })
  } catch (err) {
    console.error('Get founders error:', err)
    return res.status(500).json({
      error: 'Failed To load overdata',
    })
  }
}

export { getFounders, getFounderOptions, createFounder, getOverview }
