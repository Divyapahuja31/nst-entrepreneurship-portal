// Usage: npm run migrate:biweekly -w backend [-- --dry-run]
// Moves every bi-weekly report onto its startup. --dry-run only reports what
// would change.
import {
  ARCHIVE,
  migrateBiweeklyToVentures,
} from '../utils/biweeklyMigration.js'
import { runWithDatabase } from './connect.js'

const dryRun = process.argv.includes('--dry-run')

runWithDatabase(async () => {
  const { updated, reviewsMoved, archived } = await migrateBiweeklyToVentures({
    dryRun,
  })
  const would = dryRun ? 'Would be ' : ''
  console.info(`${would}moved onto their startup or rekeyed: ${updated}`)
  console.info(`Reviews taken over from a duplicate report: ${reviewsMoved}`)
  console.info(`${would}archived to ${ARCHIVE}: ${archived.length}`)
  for (const { id, reason } of archived) {
    console.info(`  ${id}: ${reason}`)
  }
  if (dryRun) {
    console.info('Dry run: nothing was changed.')
  }
})
