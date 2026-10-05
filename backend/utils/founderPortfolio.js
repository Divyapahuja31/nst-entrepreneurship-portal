import Venture from '../models/venture.js'
import KpiModel from '../models/kpi.js'
import ventureHealth from '../models/enums/ventureHealth.js'
import startupStage from '../models/enums/startupStage.js'

const SCORE_ON_TRACK = 70
const SCORE_WATCH = 40

export const deriveStatus = score => {
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

export const getFounderPortfolioData = async () => {
  const [ventures, kpis] = await Promise.all([
    Venture.find()
      .populate('campus', 'name')
      .populate({
        path: 'founders',
        populate: { path: 'user', select: 'username' },
      })
      .sort({ name: 1 }),

    // A score of 0 is a real grade; leaving it out inflated every average.
    KpiModel.find({ status: 'GRADED', score: { $gte: 0 } }),
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

  // Health is a property of the venture; each founder inherits it.
  const ventureHealthRows = ventures.map(venture => {
    const ventureKpis = kpisByVenture.get(venture._id.toString()) || []
    const score = ventureKpis.length
      ? Math.round(
          ventureKpis.reduce((sum, k) => sum + k.score, 0) / ventureKpis.length
        )
      : null
    return { venture, score, status: deriveStatus(score) }
  })

  const students = ventureHealthRows.flatMap(({ venture, score }) => {
    const founders = venture.founders
      .map(founder => founder.user)
      .filter(Boolean)

    return founders.map(founder => ({
      id: founder._id,
      founder: founder.username,
      startup: venture.name,
      campus: venture.campus?.name ?? null,
      // The label ("Fund Raising"), which is what the stage filter offers.
      stage: startupStage[venture.stage] ?? venture.stage,
      team: founders.length,
      score,
      status: deriveStatus(score),
    }))
  })

  return { ventures, students, ventureHealth: ventureHealthRows }
}
