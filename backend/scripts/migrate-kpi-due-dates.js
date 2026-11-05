// Usage: npm run migrate:kpi-due-dates -w backend
// Moves KPIs due at UTC midnight (5:30 am in India) to the end of their day
// in India; see utils/kpiDueDateMigration.js. Safe to run again.
import { migrateKpiDueDates } from '../utils/kpiDueDateMigration.js'
import { runWithDatabase } from './connect.js'

runWithDatabase(async () => {
  console.info(
    `KPIs now due at the end of their day: ${await migrateKpiDueDates()}`
  )
})
