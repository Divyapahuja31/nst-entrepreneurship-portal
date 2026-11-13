// A live demo of the KPI bot. Step by step it clears the last demo, sets up
// a startup whose mentor check-in has just been held, replays the meeting's
// Meet transcript, shows who each speaker is, has Gemini find the goals and
// shows the KPIs the bot recommends, for the founders or their mentor to
// accept or dismiss.
//
// Usage (needs GEMINI_API_KEY in backend/.env):
//   npm run demo:kpi-bot -w backend -- --db=<database name>
//
// --db must name the database MONGODB_URI points at, so the demo never lands
// in a real one by mistake. The presenter's account (--admin=<email> to
// change it) is made an admin, to show the result in the portal. --fast skips
// the pauses.
import mongoose from 'mongoose'
import { ROLES } from '@nst/shared/permissions.js'

import CheckIn from '../models/checkIn.js'
import Founder from '../models/founder.js'
import KPI from '../models/kpi.js'
import KpiRecommendation from '../models/kpiRecommendation.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import Venture from '../models/venture.js'
import {
  extractCheckInKpis,
  geminiExtractor,
  matchSpeaker,
  setKpiExtractor,
  speakerAccounts,
} from '../utils/kpiBot.js'
import { migrateRbac } from '../utils/rbacMigration.js'
import {
  EVENT_ID,
  PEOPLE,
  VENTURE_NAME,
  createHeldCheckIn,
  createPeople,
  createStartup,
} from './kpi-bot-demo-data.js'
import { runWithDatabase } from './connect.js'

const PASSWORD = 'Demo@12345'
const PRESENTER = 'kanishk.ranjan@adypu.edu.in'
const PORTAL = process.env.FRONTEND_URL || 'http://localhost:5173'

const option = name =>
  process.argv
    .find(arg => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
    .trim()

const FAST = process.argv.includes('--fast')
const say = (...lines) => console.info(...lines)
const pause = ms =>
  FAST
    ? null
    : new Promise(resolve => {
        setTimeout(resolve, ms)
      })

let stepNumber = 0
const step = async title => {
  stepNumber++
  say(`\n━━━ Step ${stepNumber}: ${title} ━━━`)
  await pause(1200)
}

// Removes the last demo, KPIs first, and says how many KPIs went.
const clearEarlierRun = async () => {
  const emails = Object.values(PEOPLE).map(person => person.email)
  const users = await User.find({ email: { $in: emails } }).select('_id')
  const ventures = await Venture.find({ name: VENTURE_NAME }).select('_id')
  const ventureIds = ventures.map(venture => venture._id)
  const { deletedCount } = await KPI.deleteMany({
    venture: { $in: ventureIds },
  })
  await Promise.all([
    KpiRecommendation.deleteMany({ venture: { $in: ventureIds } }),
    CheckIn.deleteMany({ googleEventId: EVENT_ID }),
    Founder.deleteMany({ venture: { $in: ventureIds } }),
  ])
  await Venture.deleteMany({ _id: { $in: ventureIds } })
  await User.deleteMany({ _id: { $in: users.map(user => user._id) } })
  return deletedCount
}

const makeAdmin = async email => {
  const admin = await Role.findOne({ name: ROLES.ADMIN })
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) {
    say(`  (${email} has no account here yet: sign up, then run this again.)`)
    return
  }
  user.role = admin._id
  await user.save()
  say(`  Presenter: ${email} (admin)`)
}

const dateOf = date =>
  date
    ? date.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
      })
    : 'no deadline'

// Who each speaker in the transcript is, as the bot sees it.
const showWhoIsWho = async ({ venture, checkIn }) => {
  const founders = await Founder.find({ venture: venture._id })
    .populate('user', 'username email googleId')
    .lean()
  const accounts = speakerAccounts(checkIn.transcript.entries)
  const speakers = [...new Set(checkIn.transcript.entries.map(e => e.speaker))]
  for (const speaker of speakers) {
    const { founder } = matchSpeaker(speaker, founders, accounts)
    const signedIn = accounts.has(speaker.toLowerCase())
    let who
    if (founder) {
      who = signedIn
        ? `founder ${founder.user.username}, by their Google account`
        : `founder ${founder.user.username}, by name`
    } else if (speaker === PEOPLE.mentor.username) {
      who = 'the mentor'
    } else {
      who = signedIn
        ? 'not a founder'
        : 'not a founder (a guest with no Google account)'
    }
    say(`  ${speaker.padEnd(16)} → ${who}`)
    await pause(700)
  }
}

// Gemini's own "too busy" (503) and rate-limit (429) answers.
const isBusy = error =>
  /"code":\s*(503|429)|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/u.test(
    String(error?.message)
  )

// The model to use, best first: when one is too busy, the demo tries again,
// then moves to the lighter one so the demo still finishes.
const MODELS = [
  process.env.GEMINI_MODEL || 'gemini-flash-latest',
  'gemini-flash-lite-latest',
]
const TRIES_PER_MODEL = 3

const askPatiently = async input => {
  let lastError
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= TRIES_PER_MODEL; attempt++) {
      try {
        return await geminiExtractor({ ...input, model })
      } catch (error) {
        if (!isBusy(error)) {
          throw error
        }
        lastError = error
        say(`  Gemini (${model}) is busy, trying again...`)
        await pause(5000)
      }
    }
  }
  throw lastError
}

// Gemini, with what it answers shown before the bot checks it.
const watchedGemini = async input => {
  const goals = await askPatiently(input)
  say(`\n  Gemini found ${goals.length} goals:`)
  for (const goal of goals) {
    say(`    • ${goal.speaker}: ${goal.title}`)
  }
  return goals
}

const askGemini = async () => {
  // Gemini can be slow when busy, so the demo waits longer than the
  // server's two minutes, and shows it is still waiting.
  setKpiExtractor(watchedGemini, { timeoutMs: 10 * 60 * 1000 })
  const startedAt = Date.now()
  const seconds = () => Math.round((Date.now() - startedAt) / 1000)
  const ticker = setInterval(
    () => say(`  ...Gemini is reading the transcript (${seconds()}s)`),
    10000
  )
  const summary = await extractCheckInKpis().finally(() =>
    clearInterval(ticker)
  )
  say(`\n  Done in ${seconds()}s.`)
  return summary
}

const showResult = async ({ people, venture, checkIn }) => {
  const names = Object.fromEntries(
    Object.values(people).map(user => [String(user._id), user.username])
  )
  const kpis = await KpiRecommendation.find({ venture: venture._id }).sort({
    founder: 1,
  })
  const run = (await CheckIn.findById(checkIn._id)).toObject().kpiExtraction
  if (run.status === 'FAILED') {
    say(`  Gemini failed: ${run.error}. Run the demo again.`)
    return
  }
  say(
    '  Every goal must quote a real line of the transcript, or it is dropped.'
  )
  say(
    `\n  ${kpis.length} KPIs recommended, for the founders or the mentor to accept:`
  )
  for (const kpi of kpis) {
    await pause(900)
    say(`\n  ✔ ${names[String(kpi.founder)]}: ${kpi.title}`)
    say(
      `      target: ${kpi.targetValue || 'none'}  |  due: ${dateOf(kpi.dueDate)}`
    )
    say(`      from: "${kpi.quote}"`)
  }
  if (run.skipped?.length) {
    say(`\n  Not given to anyone (${run.skipped.length}):`)
    for (const skipped of run.skipped) {
      say(`  ✘ ${skipped.speaker}: ${skipped.title} (${skipped.reason})`)
    }
  }
}

runWithDatabase(async () => {
  const database = mongoose.connection.db.databaseName
  if (option('db') !== database) {
    throw new Error(
      `This fills the database with demo data. MONGODB_URI points at "${database}": run with --db=${database} if that is a test database.`
    )
  }
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Set GEMINI_API_KEY in backend/.env first.')
  }
  await migrateRbac()

  await step('Clearing the last demo')
  const cleared = await clearEarlierRun()
  say(`  Removed ${cleared} KPIs from the last run.`)

  await step('A startup and its mentor')
  const { people, campus } = await createPeople(PASSWORD)
  const venture = await createStartup({ people, campus })
  say(`  Startup:  ${VENTURE_NAME}`)
  say(`  Mentor:   ${people.mentor.username}`)
  say('  Founders: Aarav Mehta and Riya Sharma, each with a Google account')
  await makeAdmin(option('admin') || PRESENTER)

  await step("Yesterday's check-in on Google Meet")
  const checkIn = await createHeldCheckIn({
    people,
    venture,
    // Hold the meeting until this script is ready to extract it.
    leaseUntil: new Date(Date.now() + 60 * 60 * 1000),
  })
  say(`  Held ${dateOf(checkIn.scheduledAt)}. Meet's transcript:\n`)
  for (const line of checkIn.transcript.text.split('\n')) {
    say(`    ${line}`)
    await pause(450)
  }

  await step('Who is who')
  await showWhoIsWho({ venture, checkIn })

  await step('Gemini reads the transcript for goals')
  await CheckIn.updateOne(
    { _id: checkIn._id },
    { $set: { 'kpiExtraction.leaseUntil': null } }
  )
  const summary = await askGemini()
  if (!summary.done && !summary.failed) {
    say(
      '  Something else took this check-in first (another demo run, or the server). Run the demo again.'
    )
    return
  }

  await step('The bot checks each goal and recommends it')
  await showResult({ people, venture, checkIn })

  await step('See it in the portal')
  say(
    `  ${PORTAL}/admin/venture/${venture._id}  (as ${option('admin') || PRESENTER})`
  )
  say(`  Founder view: ${PEOPLE.aarav.email} / ${PASSWORD}`)
})
