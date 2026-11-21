import { CYCLE_DAYS, cycleStart } from '@nst/shared/biweeklyCycles.js'
import BiWeeklySubmission from '../models/biWeeklySubmission.js'
import CheckIn from '../models/checkIn.js'
import Founder from '../models/founder.js'
import KPI from '../models/kpi.js'
import Venture from '../models/venture.js'
import { cycleOrigin } from './programme.js'

const LIMIT = 20
const text = value => String(value ?? '').slice(0, 1500)
const fields = (record, names) =>
  Object.fromEntries(names.map(name => [name, text(record?.[name])]))

const reportEvidence = (report, origin) => ({
  scope: 'TEAM',
  sourceId: String(report._id),
  cycle: report.cycle_number,
  periodStart: cycleStart(origin, report.cycle_number),
  periodEnd: new Date(
    cycleStart(origin, report.cycle_number + 1).getTime() - 1
  ),
  submittedAt: report.submitted_at,
  ...fields(report, [
    'progress_summary',
    'wins',
    'blockers',
    'goals_next_cycle',
    'mentor_meeting_notes',
    'ask_for_help',
  ]),
  metrics: Object.fromEntries(
    [
      'hours_worked',
      'customer_interviews',
      'features_shipped',
      'revenue',
      'users_acquired',
      'experiments_run',
    ].map(name => [name, report[name]])
  ),
  evidence: (report.evidence_links ?? []).slice(0, 10).map(link => ({
    ...fields(link, ['title', 'url', 'check']),
    selfConfirmed: link.self_confirmed,
  })),
  mentorFeedback: report.biWeeklyObservationSchema
    ? {
        ...fields(report.biWeeklyObservationSchema, [
          'observation',
          'strengths',
          'concerns',
          'action_items',
        ]),
        reviewedAt: report.biWeeklyObservationSchema.updated_at,
      }
    : null,
  evaluation: report.biWeeklyEvaluation
    ? {
        execution: report.biWeeklyEvaluation.execution_score,
        customer: report.biWeeklyEvaluation.customer_score,
        business: report.biWeeklyEvaluation.business_score,
        behavior: report.biWeeklyEvaluation.behavior_score,
        reviewedAt: report.biWeeklyEvaluation.updated_at,
      }
    : null,
})

const kpiEvidence = kpi => ({
  scope: kpi.founder ? 'STUDENT' : 'TEAM',
  sourceId: String(kpi._id),
  ...fields(kpi, [
    'title',
    'description',
    'targetValue',
    'actualValue',
    'feedback',
  ]),
  status: kpi.status,
  // A draft's default zero is not an assessed score.
  score: kpi.status === 'GRADED' ? kpi.score : null,
  createdAt: kpi.createdAt,
  dueDate: kpi.dueDate,
  submittedAt: kpi.submissionDate,
  evaluatedAt: kpi.evaluationDate,
  evidence: fields(kpi.evidence, ['supportingText', 'fileName', 'fileUrl']),
})

// Load from the selected student's account, never IDs supplied in the AI
// request. Team context is limited to their current membership and dates.
export const reportCardEvidence = async studentId => {
  const membership = await Founder.findOne({
    user: studentId,
    status: 'ACTIVE',
  })
    .select('venture joinedAt')
    .lean()
  const individual = await KPI.find({ founder: studentId })
    .sort({ updatedAt: -1, _id: 1 })
    .limit(LIMIT)
    .lean()
  const base = {
    collectedAt: new Date(),
    limitPerSource: LIMIT,
    kpis: individual.map(kpiEvidence),
    reports: [],
    meetingFeedback: [],
  }
  if (!membership) {
    return base
  }
  const venture = await Venture.findById(membership.venture)
    .select('createdAt')
    .lean()
  if (!venture) {
    return base
  }
  const origin = await cycleOrigin(venture)
  const since = membership.joinedAt ?? venture.createdAt
  // A late submission must still cover time when the student was a member.
  const firstCycle = Math.max(
    1,
    Math.floor((since - origin) / (CYCLE_DAYS * 86400000)) + 1
  )
  const [reports, teamKpis, meetings] = await Promise.all([
    BiWeeklySubmission.find({
      venture: venture._id,
      submitted_at: { $gte: since },
      cycle_number: { $gte: firstCycle },
    })
      .sort({ submitted_at: -1, _id: 1 })
      .limit(LIMIT)
      .populate('biWeeklyObservationSchema')
      .populate('biWeeklyEvaluation')
      .lean(),
    KPI.find({
      venture: venture._id,
      founder: null,
      $or: [
        { createdAt: { $gte: since } },
        { submissionDate: { $gte: since } },
        { evaluationDate: { $gte: since } },
      ],
    })
      .sort({ updatedAt: -1, _id: 1 })
      .limit(LIMIT)
      .lean(),
    CheckIn.find({
      venture: venture._id,
      status: 'HELD',
      scheduledAt: { $gte: since },
      'attendees.user': studentId,
      notes: { $exists: true, $ne: '' },
    })
      .select('scheduledAt notes')
      .sort({ scheduledAt: -1, _id: 1 })
      .limit(LIMIT)
      .lean(),
  ])
  return {
    ...base,
    membershipSince: since,
    kpis: [...base.kpis, ...teamKpis.map(kpiEvidence)],
    reports: reports.map(report => reportEvidence(report, origin)),
    meetingFeedback: meetings.map(meeting => ({
      scope: 'TEAM',
      sourceId: String(meeting._id),
      meetingDate: meeting.scheduledAt,
      notes: text(meeting.notes),
    })),
  }
}
