import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EVIDENCE_EXTENSIONS } from '@nst/shared/evidenceFiles.js'

import {
  evidenceContentType,
  isAllowedEvidenceFile,
} from '../utils/evidenceFile.js'

describe('evidence file types', () => {
  it('stores a real content type for every extension the dialog allows', () => {
    for (const extension of EVIDENCE_EXTENSIONS) {
      const name = `file${extension}`
      assert.equal(isAllowedEvidenceFile(name), true, extension)
      assert.notEqual(
        evidenceContentType(name),
        'application/octet-stream',
        extension
      )
    }
  })
})
