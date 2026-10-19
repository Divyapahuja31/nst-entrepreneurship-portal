import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'

import app from '../app.js'
import EmailNotification from '../models/emailNotification.js'
import EmailSettings from '../models/emailSettings.js'
import KPI from '../models/kpi.js'
import {
  getEmailProvider,
  setEmailProvider,
  withName,
} from '../utils/emailProvider.js'
import { escalationsFor } from '../utils/kpiEscalation.js'
import { sendLockedKpiEmails } from '../utils/kpiLockEmails.js'
import {
  cookieFor,
  seed,
  sentEmails,
  startDatabase,
  stopDatabase,
} from './helpers.js'

// Alpha is mentored by Mo and founded by Olu; Bo is the academic board.
let data
const STUDENT = 'olu@adypu.edu.in'
const MENTOR = 'mo@newtonschool.co'
const BOARD = 'bo@newtonschool.co'
const URL = '/api/admin/emails'

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
  await EmailSettings.deleteMany({})
  await EmailNotification.syncIndexes()
})

const as = user => ({
  get: url => request(app).get(url).set('Cookie', cookieFor(user)),
  put: (url, body) =>
    request(app).put(url).set('Cookie', cookieFor(user)).send(body),
  post: (url, body) =>
    request(app).post(url).set('Cookie', cookieFor(user)).send(body),
})

// The page's settings with `change` applied, as the Emails page sends them.
const save = async change => {
  const page = (await as(data.users.admin).get(URL)).body
  return as(data.users.admin).put(URL, change(structuredClone(page.settings)))
}

let day = 0
const lockRun = async (...scores) => {
  for (const score of scores) {
    day += 1
    const kpi = await KPI.create({
      title: `KPI ${day}`,
      description: 'Talk to customers',
      venture: data.ventures.alpha._id,
      createdBy: data.users.owner._id,
      status: 'GRADED',
      score,
      isLocked: true,
      lockedAt: new Date(),
      dueDate: new Date(2026, 0, day),
    })
    await sendLockedKpiEmails(kpi._id)
  }
}
const to = address => sentEmails.filter(email => email.to === address)

describe('the Emails page', () => {
  it('is for admins only', async () => {
    for (const user of [
      data.users.board,
      data.users.mentor,
      data.users.owner,
    ]) {
      assert.equal((await as(user).get(URL)).status, 403, user.email)
      assert.equal((await as(user).put(URL, {})).status, 403, user.email)
    }
    const res = await as(data.users.admin).get(URL)
    assert.equal(res.status, 200)
    assert.equal(res.body.settings.rules.lowPercent, 40)
    assert.ok(res.body.emails.some(e => e.key === 'student-result'))
    // Sign-in codes can't be switched off.
    const signup = res.body.emails.find(e => e.key === 'signup-verification')
    assert.equal(signup.canDisable, false)
  })

  it('stores only what differs from the defaults', async () => {
    const res = await save(settings => {
      settings.templates['student-result'].subject = 'Your {kpi} grade'
      settings.brand.title = 'NST'
      return settings
    })
    assert.equal(res.status, 200)
    assert.equal(
      res.body.settings.templates['student-result'].subject,
      'Your {kpi} grade'
    )
    const stored = await EmailSettings.findOne({ key: 'default' }).lean()
    assert.deepEqual(stored.templates, {
      'student-result': { subject: 'Your {kpi} grade' },
    })
    assert.equal(stored.brand.title, 'NST')
    assert.equal(stored.brand.footer, null)
    assert.equal(stored.rules.lowPercent, null)
  })

  it('refuses unknown placeholders, bad rules and a bad reply-to', async () => {
    const unknown = await save(settings => {
      settings.templates['mentor-follow-up'].subject = 'Hi {founder}'
      return settings
    })
    assert.equal(unknown.status, 400)
    assert.equal(unknown.body.field, 'templates.mentor-follow-up.subject')
    assert.match(unknown.body.error, /\{founder\}/)

    const rules = await save(settings => {
      settings.rules.lowPercent = 80
      return settings
    })
    assert.equal(rules.status, 400)
    assert.equal(rules.body.field, 'rules.lowPercent')

    const strikes = await save(settings => {
      settings.rules.strikes = 0
      return settings
    })
    assert.equal(strikes.status, 400)

    const replyTo = await save(settings => {
      settings.sender.replyTo = 'not an address'
      return settings
    })
    assert.equal(replyTo.status, 400)
    assert.equal(replyTo.body.field, 'sender.replyTo')
  })

  it('treats a section sent as null as empty', async () => {
    const res = await as(data.users.admin).put(URL, {
      sender: null,
      brand: null,
      rules: null,
      templates: null,
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.settings.rules.lowPercent, 40)
  })

  it('previews unsaved wording', async () => {
    const page = (await as(data.users.admin).get(URL)).body
    page.settings.templates['mentor-low-score'].subject =
      'Help {student} ({percent}%)'
    page.settings.brand.footer = 'Sent by the programme <team>'
    const res = await as(data.users.admin).post(`${URL}/preview`, {
      key: 'mentor-low-score',
      score: 30,
      settings: page.settings,
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.subject, 'Help Priya Sharma (30%)')
    // What admins type is text, never HTML.
    assert.match(res.body.html, /Sent by the programme &lt;team&gt;/)
    assert.equal(await EmailSettings.countDocuments(), 0)
  })
})

describe('sending with the settings', () => {
  it('uses the saved wording, header and footer', async () => {
    await save(settings => {
      settings.templates['student-result'].subject = 'Graded: {kpi}'
      settings.templates['student-result'].onTrackTitle = 'Well done {name}'
      settings.brand.footer = 'Questions? Ask the programme office.'
      return settings
    })
    await lockRun(90)
    const [email] = to(STUDENT)
    assert.equal(email.subject, `Graded: KPI ${day}`)
    assert.match(email.text, /Well done Olu Owner/)
    assert.match(email.text, /Questions\? Ask the programme office\.$/)
  })

  it('sends nothing for an email that is switched off', async () => {
    await save(settings => {
      settings.templates['student-result'].enabled = false
      return settings
    })
    await lockRun(90)
    assert.equal(to(STUDENT).length, 0)
  })

  it('alerts by the saved rules', async () => {
    await save(settings => {
      settings.rules = { lowPercent: 50, passPercent: 80, strikes: 3 }
      return settings
    })
    await lockRun(45, 45)
    assert.equal(to(MENTOR).length + to(BOARD).length, 0)
    await lockRun(45)
    assert.deepEqual(
      to(BOARD).map(e => e.subject),
      ["Academic Board Notification: Alpha's Evaluation Score is Below 50%"]
    )
    assert.match(to(BOARD)[0].text, /on three locked evaluations in a row/)
    assert.match(to(BOARD)[0].text, /Status: 50% or below/)
  })

  it('sends from the saved name, with a reply-to', async () => {
    const sent = []
    const previous = getEmailProvider()
    setEmailProvider({
      name: 'capture',
      sendEmail: async email => {
        sent.push(email)
        return { messageId: 'x' }
      },
    })
    try {
      await save(settings => {
        settings.sender = { fromName: 'NST Programme', replyTo: 'Team@x.org' }
        return settings
      })
      await lockRun(90)
      assert.equal(sent[0].fromName, 'NST Programme')
      assert.equal(sent[0].replyTo, 'team@x.org')
    } finally {
      setEmailProvider(previous)
    }
  })
})

describe('the parts', () => {
  it('keeps an admin’s line breaks and doesn’t double their punctuation', async () => {
    const { resolveEmailSettings } = await import('../utils/emailSettings.js')
    const { studentResultEmail } =
      await import('../utils/emailTemplates/kpiEmails.js')
    const settings = resolveEmailSettings({
      brand: { footer: 'Line one\nLine <two>' },
      templates: {
        'student-result': {
          onTrackTitle: 'Great work!',
          onTrackBody: 'Keep going.\nSee you soon.',
        },
      },
    })
    const email = studentResultEmail(
      {
        studentName: 'Priya',
        score: 90,
        totalMarks: 100,
        percentage: 90,
        evaluationName: 'KPI',
        dashboardUrl: 'https://p.example',
      },
      settings
    )
    assert.match(email.html, /Keep going\.<br>See you soon\./)
    assert.match(email.html, /Line one<br>Line &lt;two&gt;/)
    assert.match(email.text, /Great work! Keep going\./)
    assert.doesNotMatch(email.text, /!\./)
  })

  it('names the sender without changing the address', () => {
    assert.equal(
      withName('Portal <no-reply@nstsdc.org>', 'NST Programme'),
      'NST Programme <no-reply@nstsdc.org>'
    )
    assert.equal(
      withName('no-reply@nstsdc.org', 'NST'),
      'NST <no-reply@nstsdc.org>'
    )
    assert.equal(withName('no-reply@nstsdc.org', null), 'no-reply@nstsdc.org')
    assert.equal(
      withName('no-reply@nstsdc.org', 'Office, NST'),
      '"Office, NST" <no-reply@nstsdc.org>'
    )
  })

  it('counts strikes by the rules it is given', () => {
    const kpis = [30, 30].map((score, i) => ({
      _id: `k${i}`,
      score,
      dueDate: new Date(2026, 0, i + 1),
    }))
    assert.equal(escalationsFor(kpis, 'k1').board, true)
    assert.equal(
      escalationsFor(kpis, 'k1', {
        lowPercent: 40,
        passPercent: 70,
        strikes: 3,
      }).board,
      false
    )
  })
})
