import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import { cleanEvidenceLinks } from '@nst/shared/evidenceLinks.js'
import BiWeeklySubmission from '../models/biWeeklySubmission.js'

// The form, the API's checks and the schema once disagreed about evidence
// links (extra links have no checklist item, the schema required one), and
// every report with such a link failed to save. Any link the shared rules
// accept must be one the schema stores.
const TITLES = [undefined, '', '  ', 'Funnel sheet']
const URLS = [undefined, '', 'https://example.com/a', ' https://example.com/b ']
const CHECKS = [undefined, '', 'interviews']
const CONFIRMED = [undefined, true, false]

const shapes = TITLES.flatMap(title =>
  URLS.flatMap(url =>
    CHECKS.flatMap(check =>
      CONFIRMED.map(self_confirmed =>
        Object.fromEntries(
          Object.entries({ title, url, check, self_confirmed }).filter(
            ([, v]) => v !== undefined
          )
        )
      )
    )
  )
)

describe('evidence links the API accepts fit the schema', () => {
  it('for every shape of link a student can send', () => {
    for (const shape of shapes) {
      const { links, error } = cleanEvidenceLinks([shape])
      assert.equal(error, undefined, JSON.stringify(shape))
      const report = new BiWeeklySubmission({
        custom_id: 'contract',
        venture: new mongoose.Types.ObjectId(),
        cycle_number: 1,
        evidence_links: links,
      })
      const invalid = Object.keys(report.validateSync()?.errors ?? {}).filter(
        path => path.startsWith('evidence_links')
      )
      assert.deepEqual(invalid, [], JSON.stringify(shape))
    }
  })
})
