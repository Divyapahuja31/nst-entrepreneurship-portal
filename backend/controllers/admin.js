import Venture from '../models/venture.js'
import Campus from '../models/campus.js'
import KpiModel from '../models/kpi.js'
import startupStage from '../models/enums/startupStage.js'
import ventureHealth from '../models/enums/ventureHealth.js'

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
        team: venture.founders.length,
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

  console.log(monthlyData)

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

export { getFounders, getOverview }
