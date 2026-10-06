import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import Campus from '../models/campus.js'
import Founder from '../models/founder.js'
import Industry from '../models/industry.js'
import KPI from '../models/kpi.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import Venture from '../models/venture.js'
import { migrateRbac } from '../utils/rbacMigration.js'
import { signToken } from '../utils/token.js'

process.env.JWT_SECRET ||= 'test-secret'

let mongod = null

export const startDatabase = async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}

export const stopDatabase = async () => {
  await mongoose.disconnect()
  await mongod?.stop()
}

// The session cookie for a user, as the sign-in routes would set it.
export const cookieFor = user => `token=${signToken(user)}`

// One user per role (and a second mentor and admin), two startups and a few
// KPIs:
//   Alpha: mentored by `mentor`, founded by `owner`
//   Beta:  mentored by `otherMentor`, founded by `outsider`
export const seed = async () => {
  await mongoose.connection.dropDatabase()
  await migrateRbac()
  const roles = Object.fromEntries(
    (await Role.find()).map(role => [role.name, role._id])
  )

  const campus = await Campus.create({ name: 'ADYPU', location: 'Pune' })
  const industry = await Industry.create({ name: 'EdTech' })

  const user = (username, email, role) =>
    User.create({
      username,
      email,
      password: 'password123',
      role: roles[role],
      isEmailVerified: true,
    })
  const [
    admin,
    admin2,
    board,
    mentor,
    otherMentor,
    owner,
    outsider,
    applicant,
  ] = await Promise.all([
    user('Ada Admin', 'ada@newtonschool.co', 'admin'),
    user('Ben Admin', 'ben@newtonschool.co', 'admin'),
    user('Bo Board', 'bo@newtonschool.co', 'academic_board'),
    user('Mo Mentor', 'mo@newtonschool.co', 'mentor'),
    user('Max Mentor', 'max@newtonschool.co', 'mentor'),
    user('Olu Owner', 'olu@adypu.edu.in', 'student'),
    user('Oz Outsider', 'oz@adypu.edu.in', 'student'),
    user('Ana Applicant', 'ana@adypu.edu.in', 'student'),
  ])

  const venture = (name, mentorId) =>
    Venture.create({
      name,
      campus: campus._id,
      industry: industry._id,
      mentor: mentorId,
    })
  const alpha = await venture('Alpha', mentor._id)
  const beta = await venture('Beta', otherMentor._id)
  await Founder.create([
    { user: owner._id, venture: alpha._id },
    { user: outsider._id, venture: beta._id },
  ])

  const kpi = (ventureDoc, creator, fields) =>
    KPI.create({
      title: 'Interviews',
      description: 'Talk to customers',
      venture: ventureDoc._id,
      createdBy: creator._id,
      ...fields,
    })
  const kpis = {
    alphaGraded: await kpi(alpha, owner, { status: 'GRADED', score: 60 }),
    alphaDraft: await kpi(alpha, owner, { status: 'DRAFT' }),
    betaWaiting: await kpi(beta, outsider, { status: 'WAITING_FOR_APPROVAL' }),
  }

  return {
    users: {
      admin,
      admin2,
      board,
      mentor,
      otherMentor,
      owner,
      outsider,
      applicant,
    },
    ventures: { alpha, beta },
    kpis,
    campus,
    industry,
  }
}
