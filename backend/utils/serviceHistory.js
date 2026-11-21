const MINUTE = 60
const DAY = 24 * 60 * MINUTE
const CHECKS = {
  'portal-web': 'Portal page',
  'portal-signup': 'Sign-in and signup API',
}

export const historyWindow = (day, now = Date.now()) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(now)
  const date = day ?? today
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null
  }
  const start = Date.parse(`${date}T00:00:00+05:30`) / 1000
  const nextDay = start + DAY
  const end = Math.min(nextDay, Math.floor(now / 60000) * MINUTE)
  return Number.isFinite(start) &&
    date <= today &&
    new Date((start + 19800) * 1000).toISOString().startsWith(date)
    ? { date, today, start, end }
    : null
}

const measuredMinutes = (series, start, end) => {
  const measured = new Map()
  for (const item of series) {
    for (const [time, value] of item.values ?? []) {
      if (value !== '0' && value !== '1') {
        continue
      }
      const minute = Math.floor(time / MINUTE) * MINUTE
      if (!Number.isFinite(minute) || minute < start || minute >= end) {
        continue
      }
      const flags = measured.get(minute) ?? new Set()
      flags.add(value)
      measured.set(minute, flags)
    }
  }
  return measured
}

const checkIntervals = (series, { start, end }) => {
  const measured = measuredMinutes(series, start, end)
  const intervals = []
  for (let time = start; time < end; time += MINUTE) {
    const flags = measured.get(time)
    const state = flags
      ? flags.size === 2
        ? 'mixed'
        : flags.has('1')
          ? 'pass'
          : 'fail'
      : 'missing'
    const previous = intervals.at(-1)
    if (previous?.state === state) {
      previous.end = time + MINUTE
    } else {
      intervals.push({ start: time, end: time + MINUTE, state })
    }
  }
  return intervals
}

async function query(base, token, endpoint, parameters) {
  const url = new URL(base)
  url.pathname = url.pathname.replace(/\/$/, '') + endpoint
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value)
  }
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) {
    throw new Error('Monitoring query failed')
  }
  const result = await response.json()
  if (result.status !== 'success' || !Array.isArray(result.data?.result)) {
    throw new Error('Invalid monitoring response')
  }
  return result.data.result
}

async function checksFor(window) {
  const base = process.env.SERVICE_HISTORY_PROMETHEUS_URL
  if (!base) {
    return { state: 'setup-required', items: [] }
  }
  const series =
    window.end > window.start
      ? await query(
          base,
          process.env.SERVICE_HISTORY_PROMETHEUS_TOKEN,
          '/api/v1/query',
          {
            query: 'probe_success{job=~"portal-web|portal-signup"}[86401s]',
            time: window.end,
          }
        )
      : []
  return {
    state: 'available',
    items: Object.entries(CHECKS).map(([job, name]) => ({
      job,
      name,
      intervals: checkIntervals(
        series.filter(item => item.metric?.job === job),
        window
      ),
    })),
  }
}

export const validReference = value =>
  typeof value === 'string' &&
  /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(value)

const validFailureFields = ({ time, feature, method, status }) =>
  typeof feature === 'string' &&
  feature.length <= 48 &&
  typeof method === 'string' &&
  /^[A-Z]{3,12}$/.test(method) &&
  typeof time === 'string' &&
  Number.isFinite(Date.parse(time)) &&
  Number.isInteger(status) &&
  status >= 500 &&
  status < 600

const readFailure = line => {
  try {
    const { reference, time, feature, method, status } = JSON.parse(line)
    const fields = { reference, time, feature, method, status }
    if (validReference(reference) && validFailureFields(fields)) {
      return fields
    }
  } catch {
    // Skip log lines outside the service failure format.
  }
  return null
}

async function failuresFor(window, reference) {
  const base = process.env.SERVICE_HISTORY_LOKI_URL
  if (!base) {
    return { state: 'setup-required', items: [] }
  }
  const selector =
    '{app="nst-entrepreneurship-portal",environment="production"}'
  const filter = reference ? ` | reference = "${reference}"` : ''
  const end = Math.min((window.start + DAY) * 1000, Date.now())
  const streams = await query(
    base,
    process.env.SERVICE_HISTORY_LOKI_TOKEN,
    '/loki/api/v1/query_range',
    {
      query: `${selector} | json | event = "portal_http_failure"${filter}`,
      start: `${window.start}000000000`,
      end: `${end}000000`,
      limit: 100,
    }
  )
  const lines = streams.flatMap(stream => stream.values ?? [])
  const items = lines
    .map(([, line]) => readFailure(line))
    .filter(item => {
      if (!item || (reference && item.reference !== reference)) {
        return false
      }
      // The collector timestamp may differ from the time the request failed.
      const time = Date.parse(item.time)
      return time >= window.start * 1000 && time < end
    })
  items.sort((a, b) => b.time.localeCompare(a.time))
  return { state: 'available', items, truncated: lines.length >= 100 }
}

const availableResult = result =>
  result.status === 'fulfilled'
    ? result.value
    : { state: 'unavailable', items: [] }

export const serviceHistory = async (window, reference) => {
  const [checks, failures] = await Promise.allSettled([
    checksFor(window),
    failuresFor(window, reference),
  ])
  return {
    ...window,
    checks: availableResult(checks),
    failures: availableResult(failures),
  }
}
