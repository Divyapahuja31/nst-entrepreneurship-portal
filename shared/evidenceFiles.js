// The evidence files faculty can open: documents, sheets, slides, images,
// short videos and archives. Anything else (HTML, SVG, scripts,
// executables) is refused. The API checks this; the upload dialog uses it
// so a student hears before uploading.

export const EVIDENCE_EXTENSIONS = Object.freeze([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.csv',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.mp4',
  '.mov',
  '.zip',
])

export const EVIDENCE_TYPES_MESSAGE =
  'Upload a PDF, Office document, CSV, text file, image, MP4/MOV video or ZIP'

export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024

// ".PDF" and ".pdf" alike; a name without an extension has none.
export const extensionOf = fileName => {
  const match = /(?<=[^/\\])\.[^./\\]+$/.exec(String(fileName ?? ''))
  return match ? match[0].toLowerCase() : ''
}

export const isAllowedEvidenceName = fileName =>
  EVIDENCE_EXTENSIONS.includes(extensionOf(fileName))
