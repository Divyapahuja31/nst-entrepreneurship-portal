import mongoose from 'mongoose'
import { ROLES, isRole } from '@nst/shared/permissions.js'
import { validateEmail, validateName } from './validator.js'

// Checks an admin's new-account form. Returns { field: message } for each
// problem; empty when it is fine. Students need a batch and campus, as they
// do when they sign themselves up.
export const validateAccountInput = ({
  username,
  email,
  role,
  batch,
  campus,
} = {}) => {
  const error = {
    username:
      typeof username === 'string'
        ? validateName(username.trim())
        : 'Username is required',
    email:
      typeof email === 'string'
        ? validateEmail(email.trim())
        : 'Email is required',
    role: isRole(role) ? '' : 'Choose a role',
  }
  if (role === ROLES.STUDENT) {
    error.batch = mongoose.isValidObjectId(batch) ? '' : 'Batch is required'
    error.campus = mongoose.isValidObjectId(campus) ? '' : 'Campus is required'
  }
  return Object.fromEntries(Object.entries(error).filter(([, msg]) => msg))
}
