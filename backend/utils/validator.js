import mongoose from 'mongoose'
import Batch from '../models/batch.js'
import Campus from '../models/campus.js'
import Role from '../models/role.js'

const validateName = name => {
  if (!name) {
    return 'Username is required'
  }
  if (name.length <= 1) {
    return 'Username length is too small, it should be greater than 2 character'
  }
  if (!/^[a-zA-Z]+([ '-][a-zA-Z]+)*$/.test(name)) {
    return 'Username is invalid, please use a valid name only containing character and no special character'
  }

  return ''
}

const validateEmail = email => {
  if (!email) {
    return 'Email is required'
  }
  if (!/^[a-zA-Z0-9._%+-]+@(adypu\.edu\.in|newtonschool\.co)$/i.test(email)) {
    return 'Email is invalid, please use an official ADYPU or Newton School email ID'
  }
  return ''
}

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
  error.email = validateEmail(email)
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
  validateName,
  validateBatchAndCampus,
  validateEmail,
  validatePassword,
  validatePosition,
  validateAll,
}
