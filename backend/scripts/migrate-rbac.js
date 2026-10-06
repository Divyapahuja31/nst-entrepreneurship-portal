// Usage: npm run migrate:rbac -w backend
import { migrateRbac } from '../utils/rbacMigration.js'
import { runWithDatabase } from './connect.js'

runWithDatabase(async () => {
  const { renamed, usersGivenStudent, kpisUnlocked } = await migrateRbac()
  console.info(`Roles renamed: ${renamed}`)
  console.info(`Users without a valid role, now students: ${usersGivenStudent}`)
  console.info(`KPIs given a lock flag: ${kpisUnlocked}`)
})
