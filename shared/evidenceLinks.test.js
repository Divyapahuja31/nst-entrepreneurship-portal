import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_EVIDENCE_LINKS,
  cleanEvidenceLinks,
  isWebUrl,
} from './evidenceLinks.js'

describe('cleanEvidenceLinks', () => {
  it('keeps checklist links and extra links alike', () => {
    const { links } = cleanEvidenceLinks([
      { title: 'Interviews', url: 'https://a.example', check: 'interviews' },
      { title: 'Funnel sheet', url: 'https://b.example' },
    ])
    assert.deepEqual(links, [
      {
        title: 'Interviews',
        url: 'https://a.example',
        check: 'interviews',
        self_confirmed: false,
      },
      {
        title: 'Funnel sheet',
        url: 'https://b.example',
        self_confirmed: false,
      },
    ])
  })

  it('drops blank rows and titles untitled links by their address', () => {
    const { links } = cleanEvidenceLinks([
      { title: '', url: '' },
      { title: '  ', url: ' https://b.example ' },
    ])
    assert.deepEqual(links, [
      {
        title: 'https://b.example',
        url: 'https://b.example',
        self_confirmed: false,
      },
    ])
  })

  it('keeps a ticked checklist item without a link', () => {
    const { links } = cleanEvidenceLinks([
      { title: 'Shipped', url: '', check: 'shipped', self_confirmed: true },
    ])
    assert.deepEqual(links, [
      { title: 'Shipped', url: '', check: 'shipped', self_confirmed: true },
    ])
  })

  it('refuses addresses that are not web links', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,x',
      'not a link',
      5,
    ]) {
      assert.ok(cleanEvidenceLinks([{ title: 'x', url }]).error, String(url))
    }
  })

  it('refuses too many links and anything that is not a list of links', () => {
    const many = Array.from({ length: MAX_EVIDENCE_LINKS + 1 }, () => ({
      title: 'x',
    }))
    assert.ok(cleanEvidenceLinks(many).error)
    assert.ok(cleanEvidenceLinks('x').error)
    assert.ok(cleanEvidenceLinks([null]).error)
    assert.ok(cleanEvidenceLinks([['x']]).error)
  })

  it('leaves links alone when the request has none', () => {
    assert.deepEqual(cleanEvidenceLinks(undefined), { links: undefined })
  })

  it('knows web addresses', () => {
    assert.equal(isWebUrl('https://x.example'), true)
    assert.equal(isWebUrl('ftp://x.example'), false)
  })
})
