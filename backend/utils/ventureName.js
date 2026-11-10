import Venture from '../models/venture.js'

// Two startups with one name can't be told apart in lists, filters and
// emails, so a name may be used once, whatever its letter case or spacing.
export const DUPLICATE_STARTUP_NAME = 'A startup with this name already exists'

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const isStartupNameTaken = name => {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) {
    return Promise.resolve(false)
  }
  const pattern = trimmed.split(/\s+/).map(escape).join('\\s+')
  return Venture.exists({ name: new RegExp(`^\\s*${pattern}\\s*$`, 'i') })
}
