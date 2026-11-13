import { ROLES } from '@nst/shared/permissions.js'

import Batch from '../models/batch.js'
import Campus from '../models/campus.js'
import CheckIn from '../models/checkIn.js'
import Founder from '../models/founder.js'
import Industry from '../models/industry.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import Venture from '../models/venture.js'

export const VENTURE_NAME = 'EduSpark (demo)'
export const EVENT_ID = 'demo-kpi-bot'
// The people in the meeting. Founders have Google accounts, as the portal
// requires; Aarav joins Meet from his phone, under a name nobody could match
// to him, so only his account tells the bot who he is.
export const PEOPLE = {
  mentor: {
    username: 'Neha Kapoor',
    email: 'neha.kapoor.demo@newtonschool.co',
    role: ROLES.MENTOR,
  },
  aarav: {
    username: 'Aarav Mehta',
    email: 'aarav.mehta.demo@adypu.edu.in',
    role: ROLES.STUDENT,
    googleId: 'demo-google-aarav',
    inMeet: "Aarav's Pixel",
  },
  riya: {
    username: 'Riya Sharma',
    email: 'riya.sharma.demo@adypu.edu.in',
    role: ROLES.STUDENT,
    googleId: 'demo-google-riya',
    inMeet: 'Riya Sharma',
  },
}

// Who says what, and how far into the meeting (mm:ss). Rahul is a guest
// without an account, an investor friend: what he says is no one's KPI.
const MEETING = [
  [
    '00:05',
    'mentor',
    'Hi both, let us go through last two weeks and then set the goals for the next sprint.',
  ],
  [
    '00:21',
    'aarav',
    'Sure. We got 80 signups from the college fest stall last week, mostly first years.',
  ],
  [
    '00:40',
    'mentor',
    'Nice. How many of them are actually using the app every week?',
  ],
  [
    '00:52',
    'aarav',
    'Around 30 come back weekly. The quiz feature is what keeps them.',
  ],
  [
    '01:15',
    'mentor',
    'Then retention is the thing. What can you commit to for the next two weeks?',
  ],
  [
    '01:31',
    'aarav',
    'I will ship version one of the Android app on the Play Store in the next seven days.',
  ],
  [
    '01:50',
    'aarav',
    'And we will reach 200 weekly active users by the 15th of next month.',
  ],
  ['02:10', 'mentor', 'Make that 250. With the fest crowd you can do it.'],
  ['02:18', 'aarav', 'Okay, 250 weekly active users by the 15th then.'],
  ['02:40', 'mentor', 'Riya, what about the schools?'],
  [
    '02:55',
    'riya',
    'I spoke to four principals. Two want a trial with their class nine students.',
  ],
  [
    '03:20',
    'riya',
    'I will do 30 customer interviews with teachers in the next two weeks.',
  ],
  [
    '03:41',
    'riya',
    'And I will close two paid pilot schools by the end of this month.',
  ],
  [
    '04:02',
    'rahul',
    'If you get those pilots, I can intro you to two angel investors in Pune.',
  ],
  [
    '04:20',
    'mentor',
    'Good. Riya, also put together a one page pricing sheet for schools before the pilots.',
  ],
  ['04:35', 'riya', 'Yes, I will have the pricing sheet ready by Monday.'],
  [
    '04:58',
    'mentor',
    'Everyone should keep posting updates on the group, that is for all of you.',
  ],
  ['05:10', 'mentor', 'Great session. See you in two weeks.'],
]
const GUEST = 'Rahul (Guest)'

const findOrCreate = (Model, filter, fields = {}) =>
  Model.findOneAndUpdate(
    filter,
    { $setOnInsert: { ...filter, ...fields } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  )

export const createPeople = async password => {
  const campus = await findOrCreate(
    Campus,
    { name: 'ADYPU' },
    { location: 'Pune' }
  )
  const batch = await findOrCreate(
    Batch,
    { name: '2025-2029', campus: campus._id },
    { startYear: 2025, endYear: 2029 }
  )
  const roles = Object.fromEntries(
    (await Role.find()).map(role => [role.name, role._id])
  )
  const people = {}
  for (const [key, person] of Object.entries(PEOPLE)) {
    const student = person.role === ROLES.STUDENT
    people[key] = await User.create({
      username: person.username,
      email: person.email,
      password,
      role: roles[person.role],
      isEmailVerified: true,
      ...(student && {
        googleId: person.googleId,
        campus: campus._id,
        batch: batch._id,
      }),
    })
  }
  return { people, campus }
}

export const createStartup = async ({ people, campus }) => {
  const industry = await findOrCreate(Industry, { name: 'Education' })
  const venture = await Venture.create({
    name: VENTURE_NAME,
    description: 'Quiz-based revision app for school and college students.',
    campus: campus._id,
    industry: industry._id,
    mentors: [people.mentor._id],
  })
  await Founder.create([
    { user: people.aarav._id, venture: venture._id },
    { user: people.riya._id, venture: venture._id },
  ])
  return venture
}

// The meeting, held yesterday at 4 pm India time, as the transcript poller
// would have saved it from Meet.
export const createHeldCheckIn = async ({
  people,
  venture,
  botMode = 'ON',
  leaseUntil = null,
}) => {
  const scheduledAt = new Date()
  scheduledAt.setUTCDate(scheduledAt.getUTCDate() - 1)
  scheduledAt.setUTCHours(10, 30, 0, 0)

  const speakerOf = key =>
    key === 'rahul'
      ? { speaker: GUEST }
      : {
          speaker: PEOPLE[key].inMeet ?? PEOPLE[key].username,
          googleId: PEOPLE[key].googleId,
        }
  const entries = MEETING.map(([at, key, text]) => {
    const [mm, ss] = at.split(':').map(Number)
    return {
      ...speakerOf(key),
      text,
      startTime: new Date(scheduledAt.getTime() + (mm * 60 + ss) * 1000),
    }
  })
  const text = MEETING.map(
    ([at], i) => `[${at}] ${entries[i].speaker}: ${entries[i].text}`
  ).join('\n')

  return CheckIn.create({
    venture: venture._id,
    mentor: people.mentor._id,
    scheduledAt,
    durationMinutes: 30,
    timeZone: 'Asia/Kolkata',
    googleEventId: EVENT_ID,
    meetUrl: 'https://meet.google.com/demo-kpi-bot',
    status: 'HELD',
    // A mentor's own check-in has the KPI bot only when they add it.
    kpiBotMode: botMode,
    kpiExtraction: { leaseUntil },
    transcript: {
      status: 'READY',
      entries,
      text,
      truncated: false,
      fetchedAt: new Date(),
    },
  })
}
