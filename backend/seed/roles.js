import { migrateRbac } from '../utils/rbacMigration.js'
import { runWithDatabase } from '../scripts/connect.js'

// The roles are defined in @nst/shared; the migration creates any missing.
runWithDatabase(async () => {
  await migrateRbac()
  console.info('Roles seeded successfully')
})
