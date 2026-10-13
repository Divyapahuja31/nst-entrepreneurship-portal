import mongoose from 'mongoose'
import Batch from '../models/batch.js'
import Campus from '../models/campus.js'
import Role from '../models/role.js'
import {
  describeDomains,
  findEmailDomain,
  listEmailDomains,
} from './emailDomains.js'

// A name as it is stored: trimmed, single spaces, and a typographic
// apostrophe (O’Neil, which phones and Macs type) made plain.
const normalizeName = name =>
  typeof name === 'string'
    ? name.normalize('NFC').trim().replace(/\s+/g, ' ').replace(/[’‘]/g, "'")
    : name

// Letters in any script, accented ones included, joined by single spaces,
// hyphens or apostrophes.
const NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:[ '-]\p{L}[\p{L}\p{M}]*)*$/u

const validateName = value => {
  const name = normalizeName(value)
  if (!name) {
    return 'Username is required'
  }
  if (name.length < 2) {
    return 'Username must be at least 2 characters long'
  }
  if (!NAME_PATTERN.test(name)) {
    return 'Username is invalid, please use a valid name only containing character and no special character'
  }

  return ''
}

// The address's shape only; checkEmail also asks whether its domain is
// allowed.
const validateEmail = email => {
  if (!email) {
    return 'Email is required'
  }
  if (!/^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(email)) {
    return 'Email is invalid, please enter a valid email address'
  }
  return ''
}

// Whether the address's domain is one an admin allows (School Setup).
const validateEmailDomain = async email => {
  if (await findEmailDomain(email)) {
    return ''
  }
  const domains = await listEmailDomains()
  return `Please use your official school email (${describeDomains(domains)})`
}

const checkEmail = async email =>
  validateEmail(email) || (await validateEmailDomain(email))

const validatePassword = password => {
  if (!password) {
    return 'Password is required'
  }
  // A number has no length, so it would slip past the check below.
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long'
  }
  return ''
}

const validatePosition = async position => {
  if (!position) {
    return 'Position is required'
  }
  const isValidPosition = await Role.findOne({
    name: position,
  })

  if (!isValidPosition) {
    return 'Position is invalid'
  }
  return ''
}

const validateAll = async ({ username, email, password, position }) => {
  const error = {}

  error.username = validateName(username)
  error.email = await checkEmail(email)
  error.password = validatePassword(password)
  error.position = await validatePosition(position)

  return error
}

// batch and campus must name existing records. A malformed ID used to reach
// Mongoose and come back as a 500. With required false, a missing value is
// allowed (email sign-up has always treated them as optional).
const validateBatchAndCampus = async ({ batch, campus }, { required }) => {
  const check = async (value, Model, label) => {
    if (!value) {
      return required ? `${label} is required` : ''
    }
    const exists =
      mongoose.isValidObjectId(value) && (await Model.exists({ _id: value }))
    return exists ? '' : `Please select a valid ${label.toLowerCase()}`
  }
  const [batchError, campusError] = await Promise.all([
    check(batch, Batch, 'Batch'),
    check(campus, Campus, 'Campus'),
  ])
  return { batch: batchError, campus: campusError }
}

export {
  normalizeName,
  validateName,
  validateBatchAndCampus,
  checkEmail,
  validateEmail,
  validateEmailDomain,
  validatePassword,
  validatePosition,
  validateAll,
}
