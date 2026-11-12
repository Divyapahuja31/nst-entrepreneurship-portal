import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createServer } from 'vite'
import { ROLES } from '@nst/shared/permissions.js'

import Role from '../models/role.js'
import User from '../models/user.js'
import { seedReportCardTemplates } from '../seed/reportCardTemplates.js'
import { DEFAULT_EMAIL_DOMAINS, domainOf } from '../utils/emailDomains.js'
import { migrateRbac } from '../utils/rbacMigration.js'
import { validateEmail } from '../utils/validator.js'

const host = 'localhost'
const frontendPort = 5173
const url = `http://${host}:${frontendPort}`
const frontendRoot = fileURLToPath(new URL('../../frontend/', import.meta.url))
const password = randomBytes(12).toString('base64url')
const accounts = [
  {
    username: 'Demo Admin',
    role: ROLES.ADMIN,
    emailVariable: 'DEMO_ADMIN_EMAIL',
    staff: true,
  },
  {
    username: 'Asha Patel',
    role: ROLES.STUDENT,
    emailVariable: 'DEMO_STUDENT_EMAIL',
    staff: false,
  },
]

const demoEmail = ({ emailVariable, role, staff }) => {
  const { domain } = DEFAULT_EMAIL_DOMAINS.find(entry => entry.staff === staff)
  const email = (
    process.env[emailVariable] ?? `report-card-demo-${role}@${domain}`
  )
    .trim()
    .toLowerCase()
  if (validateEmail(email) || domainOf(email) !== domain) {
    throw new Error(
      `${emailVariable} must be a valid @${domain} email address.`
    )
  }
  return email
}

// Run only on the local machine, with a temporary database and demo credentials.
process.env.NODE_ENV = 'development'
process.env.JWT_SECRET = randomBytes(32).toString('hex')
process.env.EMAIL_PROVIDER = 'console'
process.env.FRONTEND_URL = url

let database
let api
let frontend

function startApi(uri) {
  // Watch loaded API modules while keeping the demo database and Vite alive.
  const entry = fileURLToPath(
    new URL('./serve-report-card-demo-api.js', import.meta.url)
  )
  api = spawn(process.execPath, ['--watch', '--watch-preserve-output', entry], {
    env: { ...process.env, REPORT_CARD_DEMO_MONGODB_URI: uri },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return new Promise((resolve, reject) => {
    api.once('error', reject)
    api.once('exit', code =>
      reject(new Error(`Demo API exited with code ${code}.`))
    )
    createInterface({ input: api.stdout }).on('line', line => {
      console.log(line)
      if (line === 'Report card demo API ready') {
        resolve()
      }
    })
    createInterface({ input: api.stderr }).on('line', line => {
      console.error(line)
      const prefix = 'Report card demo API failed: '
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
  // Vite also handles SIGTERM and can exit as soon as its server closes.
  // Signal the API watcher before starting any asynchronous cleanup.
  const apiExited =
    api?.pid && api.exitCode === null && api.signalCode === null
      ? once(api, 'exit')
      : undefined
  stopApi()
  await apiExited
  await frontend?.close()
  await mongoose.disconnect()
  await database?.stop()
}

process.once('exit', stopApi)

try {
  const demoUsers = accounts.map(account => ({
    username: account.username,
    role: account.role,
    email: demoEmail(account),
  }))
  database = await MongoMemoryServer.create()
  await mongoose.connect(database.getUri())
  await migrateRbac()
  await seedReportCardTemplates()

  const roles = new Map(
    (await Role.find().lean()).map(role => [role.name, role._id])
  )
  await User.create(
    demoUsers.map(account => ({
      ...account,
      role: roles.get(account.role),
      password,
      isEmailVerified: true,
    }))
  )

  await startApi(database.getUri())
  frontend = await createServer({
    root: frontendRoot,
    server: { host, port: frontendPort, strictPort: true },
  })
  await frontend.listen()
  console.log(`\nReport card demo: ${url}/signin`)
  for (const account of demoUsers) {
    console.log(`${account.role}: ${account.email}`)
  }
  console.log(`Password for both demo accounts: ${password}`)
  console.log('Press Ctrl+C to stop. Restart this command to reset the demo.\n')

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      close().catch(error => {
        console.error(error.message)
        process.exitCode = 1
      })
    })
  }
} catch (error) {
  console.error(`Could not start report card demo: ${error.message}`)
  await close()
  process.exitCode = 1
}
