import {
  auditContext,
  resumeAuditContext,
  withAuditContext,
} from '../utils/auditContext.js'
import { recordAudit } from '../utils/audit.js'
import { auditFingerprint } from '../utils/auditSanitize.js'

const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const AUTH_CALLBACKS = new Set([
  '/api/auth/google/callback',
  '/api/google/callback',
])
const families = {
  auth: 'AUTH',
  kpis: 'KPI',
  subkpis: 'SUBKPI',
  biweekly: 'BIWEEKLY',
  ventures: 'VENTURE',
  proposals: 'APPLICATION',
  checkins: 'CHECKIN',
  'kpi-recommendations': 'KPI_RECOMMENDATION',
}
const adminFamilies = {
  accounts: 'ACCOUNT',
  programme: 'PROGRAMME',
  'extra-sessions': 'SESSION',
  setup: 'SETUP',
  emails: 'EMAIL_SETTINGS',
  'report-cards': 'REPORT_CARD',
  ventures: 'VENTURE',
  founders: 'FOUNDER',
  proposals: 'APPLICATION',
  'join-requests': 'MEMBERSHIP',
}

const familyOf = path => {
  const [, , area, section] = path.split('/')
  return area === 'admin'
    ? (adminFamilies[section] ?? 'ADMIN')
    : (families[area] ?? 'API')
}

const identifier = value => {
  const text =
    value?._bsontype === 'ObjectId' && typeof value.toHexString === 'function'
      ? value.toHexString()
      : value
  return typeof text === 'string' && /^[a-f\d]{24}$/i.test(text)
    ? text
    : undefined
}

const cycleOf = value => {
  const text = String(typeof value === 'object' ? '' : value)
  return /^(?:[1-9]|1[0-3])$/.test(text) ? Number(text) : undefined
}

const responseId = body => {
  const ids = ['account', 'user', 'template', 'submission', 'data'].map(
    key => body?.[key]?._id ?? body?.[key]?.id
  )
  return ids.map(identifier).find(Boolean)
}

const responseSummary = body => {
  return {
    resourceId: responseId(body),
    openedCount: Array.isArray(body?.openedVentureIds)
      ? body.openedVentureIds.length
      : undefined,
    failedVentureIds: Array.isArray(body?.failedVentureIds)
      ? body.failedVentureIds.slice(0, 30).map(identifier).filter(Boolean)
      : undefined,
  }
}

const requestScope = req => {
  const body = req.body ?? {}
  const params = req.params ?? {}
  return {
    resourceType: familyOf(req.originalUrl.split('?')[0]),
    resourceId: [
      params.kpiId,
      params.studentId,
      params.userId,
      params.ventureId,
      params.id,
      params.sessionId,
    ]
      .map(identifier)
      .find(Boolean),
    ventureId: identifier(params.ventureId ?? body.ventureId),
    studentId: identifier(params.studentId),
    cycle: cycleOf(body.cycle_number),
  }
}

const outcomeOf = status => {
  if (status === 401 || status === 403) {
    return 'denied'
  }
  if (status >= 400) {
    return 'failed'
  }
  return status === 207 ? 'partial' : 'success'
}

const requestIdentity = (req, context, family) => {
  if (family !== 'AUTH') {
    return context.identity
  }
  return {
    ...context.identity,
    emailFingerprint:
      auditFingerprint(req.body?.email) ?? context.identity?.emailFingerprint,
  }
}

const requestMetadata = (req, res, context, family, started) => ({
  method: req.method,
  route: String(req.route?.path ?? '/').slice(0, 160),
  status: res.statusCode,
  durationMs: Math.round(performance.now() - started),
  isSubmit:
    typeof req.body?.isSubmit === 'boolean' ? req.body.isSubmit : undefined,
  publish:
    typeof req.body?.publish === 'boolean' ? req.body.publish : undefined,
  ...requestIdentity(req, context, family),
  signupRequired: context.signupRequired,
  response: context.response,
})

export default function audit(req, res, next) {
  const path = req.originalUrl.split('?')[0]
  const mutation = MUTATIONS.has(req.method) || AUTH_CALLBACKS.has(path)
  const family = familyOf(path)
  return withAuditContext(
    {
      requestId: res.get('X-Request-ID'),
      source: 'request',
      captureChanges: mutation,
    },
    () => {
      const context = auditContext()
      const started = performance.now()
      if (mutation) {
        const json = res.json
        res.json = function (body) {
          context.response = responseSummary(body)
          return json.call(this, body)
        }
      }
      let recorded = false
      const completed = aborted => {
        if (recorded) {
          return
        }
        recorded = true
        if (!mutation && ![401, 403].includes(res.statusCode)) {
          return
        }
        resumeAuditContext(context, () =>
          recordAudit({
            eventType: 'request',
            action: mutation
              ? `${family}_${req.method}_REQUEST`
              : 'ACCESS_DENIED',
            ...requestScope(req),
            resourceId:
              requestScope(req).resourceId ?? context.response?.resourceId,
            outcome: aborted ? 'failed' : outcomeOf(res.statusCode),
            metadata: {
              ...requestMetadata(req, res, context, family, started),
              aborted,
            },
          })
        )
      }
      res.once('finish', () => completed(false))
      res.once('close', () => {
        if (!res.writableFinished) {
          completed(true)
        }
      })
      return next()
    }
  )
}
