import path from 'node:path'

// Evidence faculty open: documents, sheets, slides, images, short videos and
// archives. Anything else (HTML, SVG, scripts, executables) is refused. The
// stored content type comes from this list, not from what the browser claims.
const EVIDENCE_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.zip': 'application/zip',
}

const extensionOf = fileName => path.extname(String(fileName)).toLowerCase()

export const isAllowedEvidenceFile = fileName =>
  Object.hasOwn(EVIDENCE_TYPES, extensionOf(fileName))

export const evidenceContentType = fileName =>
  EVIDENCE_TYPES[extensionOf(fileName)] ?? 'application/octet-stream'

// Letters, digits, dot, dash and underscore only, so the name is safe in an S3
// key and in the URL we store (a "#" or "?" used to cut the URL short, leaving
// a file that couldn't be downloaded).
export const safeEvidenceFileName = fileName =>
  String(fileName)
    .replace(/[^\w.-]+/g, '_')
    .slice(-150)
