import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import {
  ROLES,
  canChangeRoleOf,
  canDeleteAccountOf,
  isRole,
} from '@nst/shared/permissions.js'

import AuditLog from '../models/auditLog.js'
import Founder from '../models/founder.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import Venture from '../models/venture.js'
import { validateAccountInput } from '../utils/accountValidator.js'
import { normalizeEmail } from '../utils/authHelper.js'
import { deactivateFounder } from '../utils/founderHelper.js'
import { validateBatchAndCampus } from '../utils/validator.js'

// Account administration, for admins only (the route checks the role; the
// self and last-admin rules are checked here). Every change is written to
// the audit log.

const LAST_ADMIN_MESSAGE =
  'Keep at least one admin: make someone else an admin first'

const accountSummary = (user, venture = null) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  // A role outside the four (or none) shows as "no role" so it can be fixed.
  role: isRole(user.role?.name) ? user.role.name : null,
  isEmailVerified: Boolean(user.isEmailVerified || user.googleId),
  deactivatedAt: user.deletedAt ?? null,
  createdAt: user.createdAt,
  venture: venture ? { id: venture._id, name: venture.name } : null,
})

const party = user => ({ id: user._id ?? user.id, email: user.email })

const writeAudit = (req, target, fields) =>
  AuditLog.create({ actor: party(req.user), target: party(target), ...fields })

const activeAdminCount = async () => {
  const admin = await Role.findOne({ name: ROLES.ADMIN }).select('_id')
  return admin ? User.countDocuments({ role: admin._id, deletedAt: null }) : 0
}

// Startups stay with a mentor only while they are an active mentor.
const releaseMentoredVentures = userId =>
  Venture.updateMany({ mentor: userId }, { $set: { mentor: null } })

export const listAccounts = async (req, res) => {
  try {
    const [users, founders] = await Promise.all([
      User.find()
        .select(
          'username email role isEmailVerified googleId deletedAt createdAt'
        )
        .populate('role', 'name')
        .sort({ createdAt: -1 }),
      Founder.find({ status: 'ACTIVE' })
        .select('user venture')
        .populate('venture', 'name'),
    ])
    const ventureOf = new Map(founders.map(f => [String(f.user), f.venture]))
    const accounts = users.map(user =>
      accountSummary(user, ventureOf.get(String(user._id)))
    )

    return res.status(200).json({
      accounts,
      adminCount: accounts.filter(
        a => a.role === ROLES.ADMIN && !a.deactivatedAt
      ).length,
    })
  } catch (error) {
    console.error('List accounts error:', error)
    return res.status(500).json({ error: 'Could not load accounts' })
  }
}

// Field errors for a new account, including whether its batch, campus and
// email are usable.
const newAccountErrors = async body => {
  const error = validateAccountInput(body)
  if (Object.keys(error).length) {
    return error
  }
  if (body.role === ROLES.STUDENT) {
    const refs = await validateBatchAndCampus(body, { required: true })
    for (const [field, msg] of Object.entries(refs)) {
      if (msg) {
        error[field] = msg
      }
    }
  }
  if (await User.exists({ email: normalizeEmail(body.email) })) {
    error.email = 'An account already exists with this email'
  }
  return error
}

// The person signs in with Google or sets a password through "Forgot
// password", as with founders an admin adds.
export const createAccount = async (req, res) => {
  const body = req.body ?? {}
  try {
    const error = await newAccountErrors(body)
    if (Object.keys(error).length) {
      return res.status(400).json({ error })
    }
    const role = await Role.findOne({ name: body.role })
    if (!role) {
      return res
        .status(500)
        .json({ error: `${body.role} role is not configured` })
    }

    const isStudent = body.role === ROLES.STUDENT
    const user = await User.create({
      username: body.username.trim(),
      email: normalizeEmail(body.email),
      password: randomUUID(),
      role: role._id,
      batch: isStudent ? body.batch : null,
      campus: isStudent ? body.campus : undefined,
    })

    // No account without its audit entry.
    try {
      await writeAudit(req, user, {
        action: 'ACCOUNT_CREATED',
        newRole: body.role,
      })
    } catch (auditError) {
      await User.deleteOne({ _id: user._id })
      throw auditError
    }

    user.role = role
    return res.status(201).json({ account: accountSummary(user) })
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: { email: 'An account already exists with this email' } })
    }
    console.error('Create account error:', error)
    return res.status(500).json({ error: 'Could not create the account' })
  }
}

// The target account for a role change or deactivation, after the checks
// both share. Sends the error and returns null when there is none.
const findTargetAccount = async (req, res, allowed) => {
  const { userId } = req.params
  if (!mongoose.isValidObjectId(userId)) {
    res.status(400).json({ error: 'Invalid account ID' })
    return null
  }
  if (!allowed(req.user, userId)) {
    res.status(403).json({ error: "You can't change your own account" })
    return null
  }
  const target = await User.findOne({ _id: userId, deletedAt: null }).populate(
    'role',
    'name'
  )
  if (!target) {
    res.status(404).json({ error: 'No active account with that ID' })
    return null
  }
  return target
}

// Applies change to the target, then makes sure an admin is left (another
// admin may have been demoted at the same moment). Undoes it if not.
// Returns false when it was undone.
const changeKeepingAnAdmin = async (wasAdmin, change, undo) => {
  const updated = await change()
  if (!updated) {
    return null
  }
  if (wasAdmin && (await activeAdminCount()) === 0) {
    await undo()
    return false
  }
  return updated
}

// Moves target to the new role. Returns { updated } or { status, error }.
const applyRoleChange = async (target, previousRole, newRole) => {
  const oldRoleId = target.role?._id ?? target.role ?? null
  // Conditional on the role read before, so concurrent changes can't both
  // apply.
  const updated = await changeKeepingAnAdmin(
    previousRole === ROLES.ADMIN,
    () =>
      User.findOneAndUpdate(
        { _id: target._id, role: oldRoleId, deletedAt: null },
        { $set: { role: newRole._id } },
        { returnDocument: 'after' }
      ).populate('role', 'name'),
    () =>
      User.updateOne(
        { _id: target._id, role: newRole._id },
        { $set: { role: oldRoleId } }
      )
  )
  if (updated === null) {
    return {
      status: 409,
      error: 'This account changed in the meantime. Reload and try again.',
    }
  }
  if (updated === false) {
    return { status: 409, error: LAST_ADMIN_MESSAGE }
  }
  if (previousRole === ROLES.MENTOR) {
    await releaseMentoredVentures(target._id)
  }
  return { updated }
}

export const changeRole = async (req, res) => {
  try {
    const { role } = req.body ?? {}
    if (!isRole(role)) {
      return res.status(400).json({ error: 'Choose a role' })
    }
    const target = await findTargetAccount(req, res, canChangeRoleOf)
    if (!target) {
      return null
    }
    const previousRole = isRole(target.role?.name) ? target.role.name : null
    if (previousRole === role) {
      return res.status(200).json({ account: accountSummary(target) })
    }

    const newRole = await Role.findOne({ name: role })
    if (!newRole) {
      return res.status(500).json({ error: `${role} role is not configured` })
    }

    const result = await applyRoleChange(target, previousRole, newRole)
    if (result.error) {
      return res.status(result.status).json({ error: result.error })
    }
    await writeAudit(req, target, {
      action: 'ROLE_CHANGED',
      previousRole,
      newRole: role,
    })

    return res.status(200).json({ account: accountSummary(result.updated) })
  } catch (error) {
    console.error('Change role error:', error)
    return res.status(500).json({ error: 'Could not change the role' })
  }
}

// Deactivation keeps the record (KPIs and reviews point at it) but ends
// its sessions, removes it from its startup and frees the startups it mentors.
export const deactivateAccount = async (req, res) => {
  try {
    const target = await findTargetAccount(req, res, canDeleteAccountOf)
    if (!target) {
      return null
    }

    const updated = await changeKeepingAnAdmin(
      target.role?.name === ROLES.ADMIN,
      () =>
        User.findOneAndUpdate(
          { _id: target._id, deletedAt: null },
          { $set: { deletedAt: new Date() }, $inc: { sessionVersion: 1 } },
          { returnDocument: 'after' }
        ),
      () =>
        User.updateOne(
          { _id: target._id },
          { $set: { deletedAt: null }, $inc: { sessionVersion: -1 } }
        )
    )
    if (updated === null) {
      return res.status(404).json({ error: 'No active account with that ID' })
    }
    if (updated === false) {
      return res.status(409).json({ error: LAST_ADMIN_MESSAGE })
    }

    await Promise.all([
      deactivateFounder(target._id),
      releaseMentoredVentures(target._id),
    ])
    await writeAudit(req, target, {
      action: 'ACCOUNT_DEACTIVATED',
      previousRole: target.role?.name ?? null,
    })

    return res.status(200).json({ account: accountSummary(updated) })
  } catch (error) {
    console.error('Deactivate account error:', error)
    return res.status(500).json({ error: 'Could not deactivate the account' })
  }
}

export const getAuditLog = async (req, res) => {
  try {
    const entries = await AuditLog.find().sort({ createdAt: -1 }).limit(200)
    return res.status(200).json({ entries })
  } catch (error) {
    console.error('Get audit log error:', error)
    return res.status(500).json({ error: 'Could not load the activity log' })
  }
}
