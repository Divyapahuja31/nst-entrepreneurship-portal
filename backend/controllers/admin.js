import Venture from '../models/venture.js'
import Campus from '../models/campus.js'
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

const latestReportByVenture = async () => {
  const reports = []
  const byVenture = new Map()
  for (const report of reports) {
    if (!byVenture.has(report.venture)) {
      byVenture.set(report.venture, report)
    }
  }
  return byVenture
}

const getFounders = async (_, res) => {
  try {
    const [ventures, campuses, reports] = await Promise.all([
      Venture.find()
        .populate('founders', 'username')
        .populate('campus', 'name')
        .sort({ name: 1 }),
      Campus.find().sort({ name: 1 }),
      latestReportByVenture(),
    ])

    const students = ventures.flatMap(venture => {
      const report =
        reports.get(venture.name) ?? reports.get(String(venture._id))

      return venture.founders.map(founder => ({
        founder: founder.username,
        startup: venture.name,
        campus: venture.campus?.name ?? null,
        stage: report ? (startupStage[report.stage] ?? report.stage) : null,
        team: venture.founders.length,
        // TODO(kanishkranjan): replace this one kpi are add
        //hard coded for now
        score: null,
        status: deriveStatus(null),
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

const getOverview = async (_, res) => {
  try {
    const data = await Venture.find()
      .populate('founders', 'username')
      .populate('campus', 'name')
      .sort({ name: 1 })

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
    return res.json(result)
  } catch (err) {
    console.error('Get founders error:', err)
    return res.status(500).json({
      error: 'Failed To load overdata',
    })
  }
}

export { getFounders, getOverview }
