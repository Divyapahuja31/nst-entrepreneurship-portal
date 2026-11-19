import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { withAuditContext } from '../utils/auditContext.js'
import { flushAudit } from '../utils/audit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true })

// Runs task against the configured database, then disconnects. Exits with
// status 1 if it throws.
export const runWithDatabase = async task => {
  let failed = false
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    await withAuditContext(
      { source: 'script', job: path.basename(process.argv[1] ?? 'script') },
      task
    )
  } catch (error) {
    console.error(error.message || error)
    failed = true
  } finally {
    await flushAudit()
    await mongoose.disconnect()
  }
  if (failed) {
    process.exit(1)
  }
}
