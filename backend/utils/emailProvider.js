import { Resend } from 'resend'

// A provider sends one email and never throws:
//   { name, sendEmail({ to, subject, html, text }) => { messageId?, error? } }
// Resend sends them; under `npm run dev` they are printed instead (see
// defaultProvider). Tests swap in a fake with setEmailProvider.

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

// For development: prints each email in the server's terminal instead of
// sending it, so sign-up and reset codes can be read there.
export const createConsoleProvider = () => ({
  name: 'console',
  sendEmail: async ({ to, subject, text }) => {
    // The plain-text body without its signature (after the "--" line).
    const body = String(text ?? '').split('\n--\n')[0]
    console.log(
      `\n----- Email (not sent) -----\nTo: ${to}\nSubject: ${subject}\n\n${body}\n----------------------------\n`
    )
    return { messageId: null }
  },
})

// EMAIL_PROVIDER picks one ("console" or "resend"). Unset, `npm run dev`
// prints emails and everything else (npm start, production) sends them.
const defaultProvider = () => {
  const choice =
    process.env.EMAIL_PROVIDER?.trim().toLowerCase() ||
    (process.env.npm_lifecycle_event === 'dev' ? 'console' : 'resend')
  return choice === 'console' ? createConsoleProvider() : createResendProvider()
}

let provider = null

export const getEmailProvider = () => {
  provider ??= defaultProvider()
  return provider
}

export const setEmailProvider = next => {
  provider = next
}
