// Usage: npm run migrate:kpi-due-dates -w backend
// Moves existing KPI deadlines to the end of their calendar day
// in India; see utils/kpiDueDateMigration.js. Safe to run again.
import { migrateKpiDueDates } from '../utils/kpiDueDateMigration.js'
import { runWithDatabase } from './connect.js'

runWithDatabase(async () => {
  console.info(
    `KPIs now due at the end of their day: ${await migrateKpiDueDates({ confirmedDateOnly: process.argv.includes('--confirmed-date-only') })}`
  )
})
