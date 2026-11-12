import { once } from 'node:events'
import mongoose from 'mongoose'
import app from '../app.js'

let server

async function close() {
  if (server?.listening) {
    await new Promise(resolve => {
      server.close(resolve)
    })
  }
  await mongoose.disconnect()
}

try {
  // The demo launcher passes the temporary MongoDB URI to every API process.
  const uri = process.env.REPORT_CARD_DEMO_MONGODB_URI
  if (!uri) {
    throw new Error('Start this API with npm run demo:report-cards.')
  }
  await mongoose.connect(uri)
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

  console.log('Report card demo API ready')
} catch (error) {
  console.error(`Report card demo API failed: ${error.message}`)
  await close()
  process.exitCode = 1
}
