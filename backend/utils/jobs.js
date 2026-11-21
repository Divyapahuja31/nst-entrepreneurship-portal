import { processKpiDeadlines } from './kpiDeadlines.js'
import { scheduleDueSessions } from './programmeScheduler.js'
import { pollTranscripts } from './transcriptPoller.js'
import { extractCheckInKpis } from './kpiBot.js'
import { withAuditContext } from './auditContext.js'
import { recordAudit } from './audit.js'

// Every ten minutes, enforce KPI deadlines and send reminders, schedule
// programme sessions, collect Meet transcripts, and extract founders' KPIs.
// Started by server.js, never by tests.

const MINUTE_MS = 60 * 1000
const EVERY_MS = 10 * MINUTE_MS

const JOBS = [
  ['KPI deadlines', processKpiDeadlines],
  ['Programme scheduling', scheduleDueSessions],
  ['Transcript poll', pollTranscripts],
  ['KPI extraction', extractCheckInKpis],
]

let timer = null
let firstRunTimer = null
let inFlight = null

export const startBackgroundJobs = () => {
  if (timer) {
    return
  }
  // One run at a time: a slow one makes the next tick a no-op.
  const run = async () => {
    for (const [name, job] of JOBS) {
      try {
        await withAuditContext({ source: 'job', job: name }, job)
      } catch (error) {
        withAuditContext({ source: 'job', job: name }, () =>
          recordAudit({
            action: 'JOB_FAILED',
            eventType: 'system',
            outcome: 'failed',
            metadata: { errorType: error.name },
          })
        )
        console.error(`${name} failed:`, error)
      }
    }
  }
  const tick = () => {
    inFlight ??= run().finally(() => {
      inFlight = null
    })
  }
  timer = setInterval(tick, EVERY_MS)
  timer.unref()
  firstRunTimer = setTimeout(tick, MINUTE_MS)
  firstRunTimer.unref()
}

export const stopBackgroundJobs = async () => {
  clearInterval(timer)
  clearTimeout(firstRunTimer)
  timer = null
  await inFlight
}
