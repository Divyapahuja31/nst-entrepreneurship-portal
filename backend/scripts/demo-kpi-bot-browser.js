import {
  createHeldCheckIn,
  createPeople,
  createStartup,
} from './kpi-bot-demo-data.js'
import { runPortalDemo } from './portal-demo.js'

await runPortalDemo({
  title: 'KPI bot browser demo',
  scenario: 'kpi-bot',
  seed: async password => {
    const { people, campus } = await createPeople(password)
    const venture = await createStartup({ people, campus })
    await createHeldCheckIn({ people, venture, botMode: 'OFF' })
    return [
      ['Mentor', people.mentor.email],
      ['Founder (Aarav)', people.aarav.email],
      ['Founder (Riya)', people.riya.email],
    ]
  },
  steps: [
    '',
    '1. Sign in as Aarav and open Check-Ins → Transcript.',
    '2. Click Add KPI Bot and wait for the recommendations.',
    '3. Click Review Recommended KPIs, accept one suggestion and dismiss the other.',
    '   The accepted suggestion appears under Your KPIs as a draft.',
    '',
    'This demo uses a sample transcript and a fixed extraction response.',
  ],
})
