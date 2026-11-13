import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createServer } from 'vite'

import { migrateRbac } from '../utils/rbacMigration.js'

const host = 'localhost'
const frontendPort = 5173
const url = `http://${host}:${frontendPort}`
const frontendRoot = fileURLToPath(new URL('../../frontend/', import.meta.url))
let database
let api
let frontend

function startApi(uri, scenario) {
  // Watch loaded API modules while keeping the demo database and Vite alive.
  const entry = fileURLToPath(
    new URL('./serve-portal-demo-api.js', import.meta.url)
  )
  api = spawn(process.execPath, ['--watch', '--watch-preserve-output', entry], {
    env: {
      ...process.env,
      PORTAL_DEMO_MONGODB_URI: uri,
      PORTAL_DEMO_SCENARIO: scenario,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return new Promise((resolve, reject) => {
    api.once('error', reject)
    api.once('exit', code =>
      reject(new Error(`Demo API exited with code ${code}.`))
    )
    createInterface({ input: api.stdout }).on('line', line => {
      console.log(line)
      if (line === 'Portal demo API ready') {
        resolve()
      }
    })
    createInterface({ input: api.stderr }).on('line', line => {
      console.error(line)
      const prefix = 'Portal demo API failed: '
      if (line.startsWith(prefix)) {
        reject(new Error(line.slice(prefix.length)))
      }
    })
  })
}

function stopApi() {
  if (
    api?.pid &&
    api.exitCode === null &&
    api.signalCode === null &&
    !api.killed
  ) {
    api.kill('SIGTERM')
  }
}

async function close() {
  const apiExited =
    api?.pid && api.exitCode === null && api.signalCode === null
      ? once(api, 'exit')
      : undefined
  stopApi()
  // Closing Vite first removes its SIGTERM callback before it can exit
  // the parent while the API watcher is still releasing its port.
  await Promise.all([frontend?.close(), apiExited])
  await mongoose.disconnect()
  await database?.stop()
}

const reportFailure = message => {
  console.error(message)
  process.exitCode = 1
}

function printInstructions({ title, accounts, password, steps }) {
  console.log(`\n${title}: ${url}/signin`)
  for (const [label, email] of accounts) {
    console.log(`  ${label}: ${email}`)
  }
  const whose =
    accounts.length === 2 ? 'both demo accounts' : 'all demo accounts'
  console.log(`Password for ${whose}: ${password}`)
  for (const line of steps) {
    console.log(line)
  }
  console.log('Press Ctrl+C to stop. Restart this command to reset the demo.\n')
}

export async function runPortalDemo({
  title,
  seed,
  scenario = '',
  steps = [],
}) {
  // Both servers are local and share a temporary database and demo credentials.
  process.env.NODE_ENV = 'development'
  process.env.JWT_SECRET = randomBytes(32).toString('hex')
  process.env.EMAIL_PROVIDER = 'console'
  process.env.FRONTEND_URL = url
  const password = randomBytes(12).toString('base64url')
  let stopping = false
  let running = false
  const stop = () => {
    stopping = true
    if (running) {
      close().catch(error => reportFailure(error.message))
    }
  }
  process.once('exit', stopApi)
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)

  try {
    database = await MongoMemoryServer.create()
    await mongoose.connect(database.getUri())
    await migrateRbac()
    const accounts = await seed(password)

    if (!stopping) {
      await startApi(database.getUri(), scenario)
    }
    if (!stopping) {
      frontend = await createServer({
        root: frontendRoot,
        server: { host, port: frontendPort, strictPort: true },
      })
      await frontend.listen()
    }
    if (stopping) {
      await close()
      return
    }
    running = true
    printInstructions({ title, accounts, password, steps })
  } catch (error) {
    reportFailure(`Could not start ${title}: ${error.message}`)
    await close()
  } finally {
    if (!running) {
      process.off('SIGINT', stop)
      process.off('SIGTERM', stop)
    }
  }
}
