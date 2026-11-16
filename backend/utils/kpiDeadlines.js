import KPI from '../models/kpi.js'
import { findStudents, appUrl } from './kpiLockEmails.js'
import { deliver } from './emailService.js'
import { loadEmailSettings } from './emailSettings.js'
import {
  button,
  escapeHtml,
  layout,
  paragraph,
  plainText,
} from './emailTemplates/layout.js'
import { migrateKpiDueDates } from './kpiDueDateMigration.js'
import { DEFAULT_TIME_ZONE } from './programme.js'

const DAY_MS = 86400000
const LEASE_MS = 10 * 60 * 1000

// Approval submits the goal itself. Completion requires progress or evidence.
const unfinished = {
  status: { $in: ['DRAFT', 'WAITING_FOR_APPROVAL', 'ACCEPTED', 'REJECTED'] },
  isLocked: { $ne: true },
  actualValue: { $in: [null, ''] },
  'evidence.supportingText': { $in: [null, ''] },
  'evidence.fileUrl': { $in: [null, ''] },
}

const remind = async kpi => {
  const students = await findStudents(kpi)
  const { brand, sender } = await loadEmailSettings()
  const deadline = new Intl.DateTimeFormat('en-IN', {
    timeZone: DEFAULT_TIME_ZONE,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(kpi.dueDate)
  for (const student of students) {
    const message = `Hi ${student.username}, please submit your progress or evidence for "${kpi.title}" by ${deadline} (India time). A KPI without progress or evidence at the deadline will automatically receive a score of zero.`
    const url = `${appUrl()}/kpis`
    await deliver({
      type: 'KPI_DEADLINE_REMINDER',
      to: student.email,
      recipientUserId: student._id,
      dedupeKey: `kpi:${kpi._id}:deadline:${kpi.dueDate.toISOString()}`,
      sender,
      email: {
        subject: 'Your KPI deadline is approaching',
        html: layout({
          title: 'Your KPI deadline is approaching',
          preheader: message,
          brand,
          body:
            paragraph(escapeHtml(message)) +
            button({ href: url, label: 'Complete your KPI' }),
        }),
        text: plainText([message, '', url], brand),
      },
    })
  }
}

export const processKpiDeadlines = async (now = new Date()) => {
  // Normalize legacy deadlines before enforcing them, including on restart.
  await migrateKpiDueDates()
  const { modifiedCount: graded } = await KPI.updateMany(
    { ...unfinished, dueDate: { $type: 'date', $lt: now } },
    {
      $set: {
        status: 'GRADED',
        score: 0,
        feedback:
          'Automatically graded zero because no progress or evidence was submitted by the deadline.',
        evaluationDate: now,
        evaluatedBy: null,
      },
      $inc: { __v: 1 },
    }
  )
  const eligible = {
    ...unfinished,
    dueDate: { $gte: now, $lte: new Date(now.getTime() + DAY_MS) },
    $expr: {
      $ne: [{ $ifNull: ['$deadlineReminderSentFor', null] }, '$dueDate'],
    },
    $or: [
      { deadlineReminderLeaseUntil: null },
      { deadlineReminderLeaseUntil: { $lte: now } },
    ],
  }
  const candidates = await KPI.find(eligible)
    .select('_id dueDate')
    .sort({ dueDate: 1 })
    .limit(200)
    .lean()
  for (const candidate of candidates) {
    const lease = new Date(now.getTime() + LEASE_MS)
    const kpi = await KPI.findOneAndUpdate(
      { ...eligible, _id: candidate._id, dueDate: candidate.dueDate },
      { $set: { deadlineReminderLeaseUntil: lease } },
      { returnDocument: 'after' }
    )
    if (!kpi) {
      continue
    }
    try {
      await remind(kpi)
      await KPI.updateOne(
        {
          _id: kpi._id,
          dueDate: kpi.dueDate,
          deadlineReminderLeaseUntil: lease,
        },
        { $set: { deadlineReminderSentFor: kpi.dueDate } }
      )
    } catch (error) {
      console.error(
        `KPI deadline reminder for ${kpi._id} failed:`,
        error.message
      )
    } finally {
      await KPI.updateOne(
        { _id: kpi._id, deadlineReminderLeaseUntil: lease },
        { $unset: { deadlineReminderLeaseUntil: 1 } }
      )
    }
  }
  return { graded }
}
