import mongoose from 'mongoose'
import app from './app.js'
import { startBackgroundJobs, stopBackgroundJobs } from './utils/jobs.js'
import { flushAudit } from './utils/audit.js'

const PORT = process.env.PORT || 4000
let shuttingDown = false

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.info('Connected to MongoDB')
    if (!shuttingDown) {
      startBackgroundJobs()
    }
  })
  .catch(err => console.error('Error connecting to MongoDB:', err.message))

const server = app.listen(PORT, err => {
  if (err) {
    console.error('Error starting the server:', err)
    return
  }
  console.info(`Server is running on port ${PORT}`)
})

const shutdown = async () => {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  const deadline = setTimeout(() => process.exit(1), 10000)
  deadline.unref()
  await new Promise(resolve => {
    server.close(resolve)
  })
  await stopBackgroundJobs()
  await flushAudit()
  await mongoose.disconnect()
  clearTimeout(deadline)
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    shutdown().catch(error => {
      console.error('Shutdown failed:', error.name)
      process.exitCode = 1
    })
  })
}
