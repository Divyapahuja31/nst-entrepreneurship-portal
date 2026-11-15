import {
  createHeldCheckIn,
  createPeople,
  createStartup,
} from './kpi-bot-demo-data.js'
import { ROLES } from '@nst/shared/permissions.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import { runPortalDemo } from './portal-demo.js'

await runPortalDemo({
  title: 'KPI bot browser demo',
  scenario: 'kpi-bot',
  seed: async password => {
    const { people, campus } = await createPeople(password)
    const venture = await createStartup({ people, campus })
    await createHeldCheckIn({ people, venture, botMode: 'OFF' })
    const role = await Role.findOne({ name: ROLES.ADMIN })
    const admin = await User.create({
      username: 'Demo Admin',
      email: 'kpi-bot-demo-admin@newtonschool.co',
      password,
      role: role._id,
      isEmailVerified: true,
    })
    return [
      ['Admin', admin.email],
      ['Mentor', people.mentor.email],
      ['Founder (Aarav)', people.aarav.email],
      ['Founder (Riya)', people.riya.email],
    ]
  },
  steps: [
    '',
    '1. Sign in as Demo Admin. Open Startups → EduSpark (demo) → Check-Ins → Transcript.',
    '2. Click Add KPI Bot and wait for the recommendations.',
    '3. Click Review Recommended KPIs and add a founder and a startup draft KPI.',
    '4. Sign in as a founder in another browser to see the drafts under Your KPIs.',
    '',
    'This demo uses a sample transcript and a fixed extraction response.',
  ],
})
