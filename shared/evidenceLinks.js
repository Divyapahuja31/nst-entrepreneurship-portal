// The evidence links on a bi-weekly report. The API cleans what a student
// sends with cleanEvidenceLinks before saving, so every link it stores fits
// the BiWeeklySubmission schema; the form uses isWebUrl to flag bad links
// before the student saves.

export const MAX_EVIDENCE_LINKS = 20

export const EVIDENCE_URL_MESSAGE =
  'Evidence links must be web addresses starting with http:// or https://'

// Evidence URLs are typed by students and shown to faculty as links, so only
// web addresses are kept: no javascript:, data: or other schemes.
export const isWebUrl = value => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const text = value => (typeof value === 'string' ? value.trim() : '')

const isLinkObject = link =>
  link !== null && typeof link === 'object' && !Array.isArray(link)

// One link as it is stored: { link }, { error }, or {} for a blank row.
const cleanEvidenceLink = link => {
  if (!isLinkObject(link)) {
    return { error: EVIDENCE_URL_MESSAGE }
  }
  if (link.url !== undefined && typeof link.url !== 'string') {
    return { error: EVIDENCE_URL_MESSAGE }
  }
  const url = text(link.url)
  if (url && !isWebUrl(url)) {
    return { error: EVIDENCE_URL_MESSAGE }
  }
  const check = text(link.check)
  const title = text(link.title) || url || check
  if (!title) {
    return {}
  }
  return {
    link: {
      title,
      url,
      ...(check ? { check } : {}),
      self_confirmed: link.self_confirmed === true,
    },
  }
}

// Returns { error } or { links }, the links as they are stored:
// - a link is { title, url, check?, self_confirmed }
// - `check` is the checklist item it is evidence for; extra links have none
// - a blank row (no title, link or checklist item) is dropped
// - a link without a title is titled by its address
// Links left out of the request (undefined) stay as they are.
export const cleanEvidenceLinks = links => {
  if (links === undefined) {
    return { links: undefined }
  }
  if (!Array.isArray(links) || links.length > MAX_EVIDENCE_LINKS) {
    return { error: `Add at most ${MAX_EVIDENCE_LINKS} evidence links` }
  }
  const cleaned = []
  for (const raw of links) {
    const { link, error } = cleanEvidenceLink(raw)
    if (error) {
      return { error }
    }
    if (link) {
      cleaned.push(link)
    }
  }
  return { links: cleaned }
}
