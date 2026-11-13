import { once } from 'node:events'
import mongoose from 'mongoose'
import app from '../app.js'
import CheckIn from '../models/checkIn.js'
import { EVENT_ID } from './kpi-bot-demo-data.js'

let server
let stopWorker

async function close() {
  await stopWorker?.()
  if (server?.listening) {
    await new Promise(resolve => {
      server.close(resolve)
    })
  }
  await mongoose.disconnect()
}

try {
  // The demo launcher passes the temporary MongoDB URI to every API process.
  const uri = process.env.PORTAL_DEMO_MONGODB_URI
  if (!uri) {
    throw new Error('Start this API with a portal demo command.')
  }
  await mongoose.connect(uri)
  if (process.env.PORTAL_DEMO_SCENARIO === 'kpi-bot') {
    const sample = await CheckIn.findOne({ googleEventId: EVENT_ID }).select(
      '_id'
    )
    if (!sample) {
      throw new Error('The sample KPI demo check-in was not seeded.')
    }
    app.locals.kpiDemoCheckInId = sample.id
    const { startDemoKpiWorker } = await import('./kpi-bot-demo-replay.js')
    stopWorker = startDemoKpiWorker(sample._id)
  }
  server = app.listen(4000, 'localhost')
  await once(server, 'listening')

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      close().catch(error => {
        console.error(error.message)
        process.exitCode = 1
      })
    })
  }

  console.log('Portal demo API ready')
} catch (error) {
  console.error(`Portal demo API failed: ${error.message}`)
  await close()
  process.exitCode = 1
}
