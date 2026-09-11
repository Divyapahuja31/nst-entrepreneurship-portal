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

const calculateFounderStudents = async () => {
  const [ventures, kpis] = await Promise.all([
    Venture.find()
      .populate('founders', 'username')
      .populate('campus', 'name')
      .sort({ name: 1 }),
    KpiModel.find({ status: 'GRADED', score: { $gt: 0 } }),
  ])

  const kpisByVenture = new Map()
  for (const kpi of kpis) {
    if (kpi.venture) {
      const vId = kpi.venture.toString()
      if (!kpisByVenture.has(vId)) {
        kpisByVenture.set(vId, [])
      }
      kpisByVenture.get(vId).push(kpi)
    }
  }

  const students = ventures.flatMap(venture => {
    const ventureKpis = kpisByVenture.get(venture._id.toString()) || []
    const score = ventureKpis.length
      ? Math.round(
          ventureKpis.reduce((sum, k) => sum + k.score, 0) / ventureKpis.length
        )
      : null

    return venture.founders.map(founder => ({
      id: founder._id,
      founder: founder.username,
      startup: venture.name,
      campus: venture.campus?.name ?? null,
      stage: venture.stage,
      team: venture.teamSize,
      score,
      status: deriveStatus(score),
    }))
  })

  return { ventures, students }
}

const getFounders = async (_, res) => {
  try {
    const [{ students }, campuses] = await Promise.all([
      calculateFounderStudents(),
      Campus.find().sort({ name: 1 }),
    ])

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

async function getMonthlyAverageKPIScores({
  year = new Date().getFullYear(),
} = {}) {
  const startOfYear = new Date(Date.UTC(year, 0, 1))
  const endOfYear = new Date(Date.UTC(year + 1, 0, 1))

  const [ventures, kpis] = await Promise.all([
    Venture.find().select('_id founders'),
    KpiModel.find({
      score: { $gt: 0 },
      $or: [
        { evaluationDate: { $gte: startOfYear, $lt: endOfYear } },
        { createdAt: { $gte: startOfYear, $lt: endOfYear } },
      ],
    }),
  ])

  const ventureFoundersCount = new Map(
    ventures.map(v => [v._id.toString(), v.founders?.length || 0])
  )

  const kpisByMonth = Array.from({ length: 12 }, () => [])
  for (const kpi of kpis) {
    const date = new Date(kpi.evaluationDate || kpi.createdAt)
    if (date >= startOfYear && date < endOfYear) {
      kpisByMonth[date.getUTCMonth()].push(kpi)
    }
  }

  const result = {}
  MONTH_NAMES.forEach((monthName, monthIndex) => {
    const monthKpis = kpisByMonth[monthIndex]
    if (monthKpis.length === 0) {
      result[monthName] = 0
      return
    }

    const byVenture = new Map()
    for (const kpi of monthKpis) {
      if (!kpi.venture) {
        continue
      }
      const vId = kpi.venture.toString()
      const current = byVenture.get(vId) || { sum: 0, count: 0 }
      current.sum += kpi.score
      current.count += 1
      byVenture.set(vId, current)
    }

    let totalScore = 0
    let totalWeight = 0
    for (const [vId, { sum, count }] of byVenture) {
      const weight = ventureFoundersCount.get(vId) || 0
      totalScore += (sum / count) * weight
      totalWeight += weight
    }

    result[monthName] = totalWeight ? Math.round(totalScore / totalWeight) : 0
  })

  return result
}

const getOverview = async (_, res) => {
  try {
    const [{ ventures, students }, kpi] = await Promise.all([
      calculateFounderStudents(),
      getMonthlyAverageKPIScores(),
    ])

    const overview = {
      founder: students.length,
      onTrack: students.filter(s => s.status === ventureHealth.ON_TRACK).length,
      watch: students.filter(s => s.status === ventureHealth.WATCH).length,
      atRisk: students.filter(s => s.status === ventureHealth.AT_RISK).length,
    }

    const result = ventures.reduce(
      (accumulate, currentValue) => {
        const campusKey = currentValue.campus?.name ?? 'Unknown'
        const stageKey = currentValue.stage ?? 'Unknown'

        accumulate.campus[campusKey] = (accumulate.campus[campusKey] ?? 0) + 1
        accumulate.stage[stageKey] = (accumulate.stage[stageKey] ?? 0) + 1

        return accumulate
      },
      { campus: {}, stage: {} }
    )
    return res.json({ result, kpi, overview })
  } catch (err) {
    console.error('Get overview error:', err)
    return res.status(500).json({
      error: 'Failed To load overdata',
    })
  }
}

const removeFounderFromVenture = async founderId => {
  if (!mongoose.isValidObjectId(founderId)) {
    return {
      founderId,
      message: 'Valid founderId is required',
    }
  }

  const venture = await Venture.findOneAndUpdate(
    { founders: founderId },
    { $pull: { founders: founderId } },
    { new: true }
  )

  if (!venture) {
    return {
      founderId,
      message: 'Startup not found for founder',
    }
  }

  return {
    founderId,
    startup: venture.name,
    message: 'Founder removed successfully',
  }
}

const deleteFounders = async (req, res) => {
  try {
    const founders = req.body.founders || []
    const response = await Promise.all(founders.map(removeFounderFromVenture))

    return res.status(200).json({ result: response })
  } catch (err) {
    console.error('Delete founders error:', err)
    return res.status(500).json({
      error: 'Failed to delete founders',
    })
  }
}

const getBiWeekly = async (req, res) => {
  try {
    const { founderId } = req.query
    if (!founderId || !mongoose.isValidObjectId(founderId)) {
      return res.status(400).json({ error: 'Valid founderId is required' })
    }

    const founder = await User.findById(founderId)
      .populate({
        path: 'biWeeklySubmission',
        populate: [
          { path: 'biWeeklyEvaluation' },
          { path: 'biWeeklyObservationSchema' },
        ],
      })
      .exec()

    if (!founder) {
      return res.status(404).json({ error: 'Founder not found' })
    }

    const venture = await Venture.findOne({ founders: founderId })

    const submissions = founder.biWeeklySubmission || []
    const evaluations = submissions
      .map(sub => sub.biWeeklyEvaluation)
      .filter(Boolean)
    const observations = submissions
      .map(sub => sub.biWeeklyObservationSchema)
      .filter(Boolean)

    return res.json({
      founder,
      venture,
      submissions,
      evaluations,
      observations,
    })
  } catch (err) {
    console.error('Get biweekly error:', err)
    return res.status(500).json({
      error: 'Failed to load bi-weekly data',
    })
  }
}

export {
  getFounders,
  getFounderOptions,
  createFounder,
  getOverview,
  deleteFounders,
  getBiWeekly,
}
