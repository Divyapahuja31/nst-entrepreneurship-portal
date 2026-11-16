import { createHash, createHmac } from 'node:crypto'

const PRIVATE_KEY =
  /password|secret|token|authorization|cookie|credential|otp|oauth|code|api[-_]?key|private[-_]?key|pendingSignup|transcript|observation|supportingText|fileUrl|meetUrl|^session$|^url$|^body$/i
const MAX_BYTES = 4000

const safeString = value =>
  value
    .replace(/Bearer\s+[^\s]+/gi, '[redacted]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[redacted]')
    .replace(/https?:\/\/[^\s]+/gi, '[link]')
    .slice(0, 256)

const primitive = value => {
  if (typeof value === 'bigint') {
    return String(value)
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null
  }
  if (value?._bsontype === 'ObjectId') {
    return String(value)
  }
  if (typeof value === 'string') {
    return safeString(value)
  }
  return value
}

const walkFields = (value, depth, seen, budget) => {
  const result = {}
  const keys = Object.keys(value)
  for (const key of keys.slice(0, 60)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) {
      continue
    }
    result[key] = PRIVATE_KEY.test(key)
      ? '[redacted]'
      : walk(value[key], depth + 1, seen, budget)
  }
  if (keys.length > 60) {
    result.auditTruncated = true
  }
  return result
}

const walk = (value, depth, seen, budget) => {
  if (--budget.remaining < 0) {
    return '[truncated]'
  }
  const basic = primitive(value)
  if (typeof basic !== 'object' || basic === null) {
    return basic
  }
  if (basic !== value) {
    return basic
  }
  if (depth >= 4 || seen.has(value)) {
    return '[truncated]'
  }
  seen.add(value)
  if (Array.isArray(value)) {
    const items = value
      .slice(0, 30)
      .map(item => walk(item, depth + 1, seen, budget))
    return value.length > 30 ? [...items, '[truncated]'] : items
  }
  return walkFields(value, depth, seen, budget)
}

export const sanitizeAudit = value => {
  const safe = walk(value, 0, new WeakSet(), { remaining: 512 })
  return Buffer.byteLength(JSON.stringify(safe) ?? '') > MAX_BYTES
    ? { _id: safe?._id, truncated: true }
    : safe
}

// Keyed identity fingerprints support incident lookup without recording
// attempted email addresses or Google subjects from unauthenticated callers.
export const auditFingerprint = value => {
  const key = process.env.AUDIT_HASH_KEY || process.env.JWT_SECRET
  return key && typeof value === 'string'
    ? createHmac('sha256', key).update(value.trim().toLowerCase()).digest('hex')
    : undefined
}

export const textEvidence = value => {
  const text = typeof value === 'string' ? value : ''
  return {
    length: text.length,
    digest: createHash('sha256').update(text).digest('hex'),
  }
}
