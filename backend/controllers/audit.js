import mongoose from 'mongoose'
import AuditLog from '../models/auditLog.js'
import { auditWriterStats } from '../utils/audit.js'
import { auditFingerprint } from '../utils/auditSanitize.js'

const FILTER_FIELDS = [
  'action',
  'resourceType',
  'resourceId',
  'ventureId',
  'studentId',
  'requestId',
  'outcome',
]
const invalid = () => ({ error: 'Check the audit filters and date range.' })

const readScalars = query => {
  const filter = {}
  for (const key of FILTER_FIELDS) {
    const value = query[key]
    if (value === undefined || value === '') {
      continue
    }
    if (typeof value !== 'string' || value.length > 100) {
      return invalid()
    }
    filter[key] = value
  }
  return { filter }
}

const readRange = (query, filter) => {
  if (query.cycle) {
    const cycle = Number(query.cycle)
    if (!Number.isInteger(cycle) || cycle < 1 || cycle > 13) {
      return invalid()
    }
    filter.cycle = cycle
  }
  if (query.from || query.until) {
    const from = Date.parse(query.from)
    const until = Date.parse(query.until)
    if (!Number.isFinite(from) || !Number.isFinite(until) || from > until) {
      return invalid()
    }
    filter.createdAt = { $gte: new Date(from), $lte: new Date(until) }
  }
  return { filter }
}

const readIdentity = (query, filter) => {
  if (query.actorId) {
    if (!mongoose.isObjectIdOrHexString(query.actorId)) {
      return invalid()
    }
    filter['actor.id'] = {
      $in: [query.actorId, new mongoose.Types.ObjectId(query.actorId)],
    }
  }
  if (query.identityEmail) {
    if (
      typeof query.identityEmail !== 'string' ||
      query.identityEmail.length > 254
    ) {
      return invalid()
    }
    const fingerprint = auditFingerprint(query.identityEmail)
    filter.$or = [
      { 'metadata.emailFingerprint': fingerprint },
      { 'after.emailFingerprint': fingerprint },
      { 'before.emailFingerprint': fingerprint },
    ]
  }
  return { filter }
}

const withCursor = (filter, cursor) => {
  if (!cursor) {
    return { filter }
  }
  if (typeof cursor !== 'string' || cursor.length > 100) {
    return invalid()
  }
  const [time, id] = cursor.split('|')
  const date = new Date(time)
  if (!Number.isFinite(date.getTime()) || !mongoose.isObjectIdOrHexString(id)) {
    return invalid()
  }
  return {
    filter: {
      $and: [
        filter,
        {
          $or: [
            { createdAt: { $lt: date } },
            { createdAt: date, _id: { $lt: new mongoose.Types.ObjectId(id) } },
          ],
        },
      ],
    },
  }
}

export const getAuditHistory = async (req, res) => {
  res.set('Cache-Control', 'no-store')
  const scalars = readScalars(req.query)
  if (scalars.error) {
    return res.status(400).json(scalars)
  }
  const identity = readIdentity(req.query, scalars.filter)
  if (identity.error) {
    return res.status(400).json(identity)
  }
  const parsed = readRange(req.query, identity.filter)
  if (parsed.error) {
    return res.status(400).json(parsed)
  }
  const paged = withCursor(parsed.filter, req.query.cursor)
  const limit = Number(req.query.limit ?? 50)
  if (paged.error || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json(invalid())
  }
  const entries = await AuditLog.find(paged.filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .maxTimeMS(2000)
    .lean()
  const hasMore = entries.length > limit
  entries.length = Math.min(entries.length, limit)
  const last = entries.at(-1)
  return res.json({
    entries,
    nextCursor: hasMore ? `${last.createdAt.toISOString()}|${last._id}` : null,
    writer: auditWriterStats(),
  })
}
