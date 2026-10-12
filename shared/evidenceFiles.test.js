import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { extensionOf, isAllowedEvidenceName } from './evidenceFiles.js'

describe('evidence files', () => {
  it('allows documents, images, videos and archives, in any letter case', () => {
    for (const name of [
      'report.pdf',
      'Deck.PPTX',
      'photo.jpeg',
      'demo.mov',
      'all.zip',
    ]) {
      assert.equal(isAllowedEvidenceName(name), true, name)
    }
  })

  it('refuses pages, scripts, executables and files without an extension', () => {
    for (const name of [
      'a.html',
      'logo.svg',
      'run.js',
      'setup.exe',
      'pdf',
      '.pdf',
      'notes.pdf.exe',
    ]) {
      assert.equal(isAllowedEvidenceName(name), false, name)
    }
  })

  it('reads the last extension only', () => {
    assert.equal(extensionOf('archive.tar.gz'), '.gz')
    assert.equal(extensionOf('folder.v2/readme'), '')
  })
})
