import KpiModel from '../models/kpi.js'
import Venture from '../models/venture.js'
import VentureProposal from '../models/ventureProposal.js'
import VentureJoinRequest from '../models/ventureJoinRequest.js'
import ventureHealth from '../models/enums/ventureHealth.js'
import startupStage from '../models/enums/startupStage.js'
import { getFounderPortfolioData } from '../utils/founderPortfolio.js'

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
    Venture.find().select('_id').populate('teamSize'),
    KpiModel.find({
      status: 'GRADED',
      score: { $gte: 0 },
      evaluationDate: { $gte: startOfYear, $lt: endOfYear },
    }).select('score evaluationDate venture'),
  ])

  const ventureFoundersCount = new Map(
    ventures.map(v => [v._id.toString(), v.teamSize || 0])
  )

  const kpisByMonth = Array.from({ length: 12 }, () => [])
  for (const kpi of kpis) {
    const date = new Date(kpi.evaluationDate)
    if (date >= startOfYear && date < endOfYear) {
      kpisByMonth[date.getUTCMonth()].push(kpi)
    }
  }

  const result = {}
  MONTH_NAMES.forEach((monthName, monthIndex) => {
    const monthKpis = kpisByMonth[monthIndex]
    // No grades that month: there is no score, which is not the same as 0.
    if (monthKpis.length === 0) {
      result[monthName] = null
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

    result[monthName] = totalWeight
      ? Math.round(totalScore / totalWeight)
      : null
  })

  return result
}

// Every stage in pipeline order, including empty ones, so the chart reads
// as a funnel from Ideation to Fund Raising.
const countStages = ventures =>
  Object.entries(startupStage).map(([key, label]) => ({
    key,
    label,
    count: ventures.filter(v => v.stage === key).length,
  }))

const countCampuses = ventures => {
  const counts = new Map()
  for (const venture of ventures) {
    const name = venture.campus?.name ?? 'Unknown'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts].map(([name, count]) => ({ name, count }))
}

// How many items wait in a queue and since when the oldest has waited.
const queueOf = async (Model, filter, dateField) => {
  const [count, oldest] = await Promise.all([
    Model.countDocuments(filter),
    Model.findOne(filter)
      .sort({ [dateField]: 1 })
      .select(dateField)
      .lean(),
  ])
  return { count, oldestAt: oldest?.[dateField] ?? null }
}

// Work waiting on admins, so the overview starts with what to act on.
const getActionQueue = async () => {
  const [proposals, joinRequests, kpisToGrade, missedDeadlines] =
    await Promise.all([
      queueOf(VentureProposal, { status: 'PENDING' }, 'createdAt'),
      queueOf(VentureJoinRequest, { status: 'PENDING' }, 'createdAt'),
      queueOf(KpiModel, { status: 'WAITING_FOR_APPROVAL' }, 'submissionDate'),
      // Past the due date and never submitted: the KPI is now locked.
      queueOf(
        KpiModel,
        {
          status: { $in: ['DRAFT', 'REJECTED'] },
          dueDate: { $lt: new Date() },
        },
        'dueDate'
      ),
    ])
  return { proposals, joinRequests, kpisToGrade, missedDeadlines }
}

const getOverview = async (_, res) => {
  try {
    const [{ ventures, students, ventureHealth: health }, kpi, actions] =
      await Promise.all([
        getFounderPortfolioData(),
        getMonthlyAverageKPIScores(),
        getActionQueue(),
      ])

    // Counted per venture, so a four-person team counts once, and every
    // venture lands in exactly one bucket (including "no reviews yet").
    const countHealth = status => health.filter(h => h.status === status).length
    const overview = {
      ventures: ventures.length,
      founders: students.length,
      onTrack: countHealth(ventureHealth.ON_TRACK),
      watch: countHealth(ventureHealth.WATCH),
      atRisk: countHealth(ventureHealth.AT_RISK),
      noReviews: countHealth(ventureHealth.NO_REVIEWS),
    }

    return res.json({
      actions,
      kpi,
      overview,
      stages: countStages(ventures),
      campuses: countCampuses(ventures),
    })
  } catch (err) {
    console.error('Get overview error:', err.message || err)
    return res.status(500).json({
      error: 'Failed to load overview data',
    })
  }
}

export { getOverview }
