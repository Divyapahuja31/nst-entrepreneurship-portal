import crypto from 'node:crypto'

// Google refresh tokens are encrypted at rest with AES-256-GCM, so a
// database dump alone can't reach anyone's calendar. The key is
// GOOGLE_TOKEN_KEY: 32 random bytes, base64 (`openssl rand -base64 32`) or
// hex (`openssl rand -hex 32`) encoded.

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const VERSION = 'v1'

const decodeKey = raw =>
  /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64')

const key = () => {
  const raw = process.env.GOOGLE_TOKEN_KEY?.trim()
  const bytes = raw ? decodeKey(raw) : null
  if (bytes?.length !== 32) {
    throw new Error(
      'GOOGLE_TOKEN_KEY must be 32 bytes, base64 or hex encoded (openssl rand -base64 32)'
    )
  }
  return bytes
}

// "v1.<iv>.<tag>.<ciphertext>", each part base64url.
export const encryptToken = plaintext => {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv)
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return [VERSION, iv, cipher.getAuthTag(), data]
    .map(part => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.')
}

// Throws when the value was changed or encrypted with another key.
export const decryptToken = value => {
  const [version, iv, tag, data] = String(value).split('.')
  if (version !== VERSION || !iv || !tag || !data) {
    throw new Error('Not an encrypted token')
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key(),
    Buffer.from(iv, 'base64url')
  )
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
