import { Resend } from 'resend'

// A provider sends one email and never throws:
//   { name, sendEmail({ to, subject, html, text }) => { messageId?, error? } }
// Resend is the default; tests swap in a fake with setEmailProvider.

// Accepts `Name <a@b.com>`, `Name a@b.com` and `a@b.com`. Returns null when
// there is no address in it.
export const normalizeFrom = value => {
  const from = typeof value === 'string' ? value.trim() : ''
  const match = from.match(/^(.*?)\s*<?([^\s<>]+@[^\s<>]+?)>?$/)
  if (!match) {
    return null
  }
  const name = match[1].replace(/^"|"$/g, '').trim()
  return name ? `${name} <${match[2]}>` : match[2]
}

const failure = message => {
  console.warn(`Email not sent: ${message}`)
  return { error: message }
}

let client = null
let clientKey = null

// One client per key, created on first use so the .env has been loaded.
const resendClient = apiKey => {
  if (clientKey !== apiKey) {
    client = new Resend(apiKey)
    clientKey = apiKey
  }
  return client
}

export const createResendProvider = () => ({
  name: 'resend',
  sendEmail: async ({ to, subject, html, text }) => {
    const apiKey = process.env.RESEND_API_KEY?.trim()
    const from = normalizeFrom(process.env.EMAIL_FROM)
    if (!apiKey || !from) {
      return failure('RESEND_API_KEY and EMAIL_FROM must both be set')
    }
    try {
      const { data, error } = await resendClient(apiKey).emails.send({
        from,
        to,
        subject,
        html,
        text,
      })
      if (error) {
        return failure(error.message || 'Resend rejected the email')
      }
      return { messageId: data?.id }
    } catch (error) {
      return failure(error.message || 'Could not reach Resend')
    }
  },
})

let provider = null

export const getEmailProvider = () => {
  provider ??= createResendProvider()
  return provider
}

export const setEmailProvider = next => {
  provider = next
}
