import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'

import Venture from '../models/venture.js'
import { migrateVentureMentors } from '../utils/ventureMentorsMigration.js'
import { seed, startDatabase, stopDatabase } from './helpers.js'

let data

before(startDatabase)
after(stopDatabase)
beforeEach(async () => {
  data = await seed()
})

// A startup as it was stored before it could have more than one mentor.
const oldVenture = (name, mentor) =>
  Venture.collection.insertOne({
    name,
    campus: data.ventures.alpha.campus,
    industry: data.ventures.alpha.industry,
    mentor,
  })

describe('moving startups to a list of mentors', () => {
  it('keeps each mentor, gives none to a startup without one, and reruns safely', async () => {
    const { insertedId: withMentor } = await oldVenture(
      'Gamma',
      data.users.mentor._id
    )
    const { insertedId: without } = await oldVenture('Delta', null)

    assert.equal(await migrateVentureMentors(), 2)

    const gamma = await Venture.collection.findOne({ _id: withMentor })
    assert.deepEqual(gamma.mentors.map(String), [String(data.users.mentor._id)])
    // Kept for a previous version still reading it.
    assert.equal(String(gamma.mentor), String(data.users.mentor._id))
    const delta = await Venture.collection.findOne({ _id: without })
    assert.deepEqual(delta.mentors, [])

    assert.equal(await migrateVentureMentors(), 0)
    const alpha = await Venture.findById(data.ventures.alpha._id)
    assert.deepEqual(alpha.mentors.map(String), [String(data.users.mentor._id)])
  })
})
