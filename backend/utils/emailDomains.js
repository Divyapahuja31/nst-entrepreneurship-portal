import EmailDomain from '../models/emailDomain.js'

// What a database that has never had a list starts with: the domains the
// portal was built for. Newton School staff start as mentors.
export const DEFAULT_EMAIL_DOMAINS = Object.freeze([
  { domain: 'newtonschool.co', staff: true },
  { domain: 'adypu.edu.in', staff: false },
])

const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/

// A domain as it is stored: lower case, without a leading "@". Null when it
// isn't one.
export const normalizeDomain = value => {
  if (typeof value !== 'string') {
    return null
  }
  const domain = value.trim().toLowerCase().replace(/^@/, '')
  return DOMAIN_PATTERN.test(domain) && domain.length <= 253 ? domain : null
}

export const domainOf = email => {
  const parts = typeof email === 'string' ? email.trim().split('@') : []
  return parts.length === 2 ? parts[1].toLowerCase() : ''
}

// Every allowed domain, A to Z. The defaults are added the first time the
// list is read; the last domain can't be removed, so it is never empty again.
export const listEmailDomains = async () => {
  const domains = await EmailDomain.find().sort({ domain: 1 }).lean()
  if (domains.length) {
    return domains
  }
  await EmailDomain.bulkWrite(
    DEFAULT_EMAIL_DOMAINS.map(entry => ({
      updateOne: {
        filter: { domain: entry.domain },
        update: { $setOnInsert: entry },
        upsert: true,
      },
    }))
  )
  return EmailDomain.find().sort({ domain: 1 }).lean()
}

// The allowed domain an email belongs to, or null.
export const findEmailDomain = async email => {
  const domain = domainOf(email)
  if (!domain) {
    return null
  }
  const domains = await listEmailDomains()
  return domains.find(entry => entry.domain === domain) ?? null
}

// "@a.edu", "@a.edu or @b.co", "@a.edu, @b.co or @c.org"
export const describeDomains = domains => {
  const names = domains.map(entry => `@${entry.domain}`)
  return names.length > 1
    ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`
    : (names[0] ?? '')
}
