import { randomUUID } from 'node:crypto'

const featureOf = path => {
  const [, , group, action] = path.split('/')
  const features = {
    auth: 'Sign-in and accounts',
    kpis: 'KPIs',
    subkpis: 'KPIs',
    biweekly: 'Bi-weekly reports',
    'report-card': 'Report cards',
  }
  if (group === 'admin') {
    return action === 'report-cards' ? 'Report cards' : 'Admin'
  }
  return Object.hasOwn(features, group) ? features[group] : 'Other API'
}

export default function serviceErrors(req, res, next) {
  const reference = randomUUID()
  const feature = featureOf(req.originalUrl.split('?')[0])
  res.set('X-Request-ID', reference)
  res.once('finish', () => {
    if (res.statusCode >= 500) {
      console.error(
        JSON.stringify({
          event: 'portal_http_failure',
          time: new Date().toISOString(),
          reference,
          feature,
          method: req.method,
          status: res.statusCode,
        })
      )
    }
  })
  next()
}
