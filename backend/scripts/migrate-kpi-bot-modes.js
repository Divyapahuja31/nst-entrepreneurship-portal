// Usage: npm run migrate:kpi-bot-modes -w backend
// Turns the KPI bot on for existing bi-weekly session meetings and off for
// other meetings it hasn't read; see utils/kpiBotModeMigration.js. Safe to
// run again.
import { migrateKpiBotModes } from '../utils/kpiBotModeMigration.js'
import { runWithDatabase } from './connect.js'

runWithDatabase(async () => {
  const counts = await migrateKpiBotModes()
  console.info(
    `KPI bot modes set: ${counts.AUTO} bi-weekly (auto), ${counts.ON} on, ${counts.OFF} off`
  )
})
