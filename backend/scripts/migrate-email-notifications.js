// Usage: npm run migrate:email -w backend
// Creates the email log and its indexes, including the unique index that
// stops one email being sent twice. Safe to run again.
import EmailNotification from '../models/emailNotification.js'
import { runWithDatabase } from './connect.js'

runWithDatabase(async () => {
  await EmailNotification.createCollection()
  const dropped = await EmailNotification.syncIndexes()
  console.info('Email log indexes are up to date')
  if (dropped.length) {
    console.info(`Dropped outdated indexes: ${dropped.join(', ')}`)
  }
})
