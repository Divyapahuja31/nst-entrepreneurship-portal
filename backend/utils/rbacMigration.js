import { ROLE_LABELS, ROLE_NAMES, ROLES } from '@nst/shared/permissions.js'
import KPI from '../models/kpi.js'
import Role from '../models/role.js'
import User from '../models/user.js'

// Role names before the four-role system. Users holding one are moved to
// the current name.
const RENAMED_ROLES = { 'academic board': ROLES.ACADEMIC_BOARD }

const renameRole = async (oldName, newName) => {
  const old = await Role.findOne({ name: oldName })
  if (!old) {
    return 0
  }
  const current = await Role.findOne({ name: newName })
  if (!current) {
    await Role.updateOne({ _id: old._id }, { $set: { name: newName } })
    return 1
  }
  await User.updateMany({ role: old._id }, { $set: { role: current._id } })
  await Role.deleteOne({ _id: old._id })
  return 1
}

// Brings the database up to the four-role system. Safe to run again: each
// step only changes what isn't already right. It never infers a staff role;
// anyone without a valid role becomes a student.
export const migrateRbac = async () => {
  let renamed = 0
  for (const [oldName, newName] of Object.entries(RENAMED_ROLES)) {
    renamed += await renameRole(oldName, newName)
  }

  for (const name of ROLE_NAMES) {
    await Role.updateOne(
      { name },
      { $set: { name, description: ROLE_LABELS[name] } },
      { upsert: true }
    )
  }

  const roles = await Role.find({ name: { $in: ROLE_NAMES } }).select('_id')
  const student = await Role.findOne({ name: ROLES.STUDENT }).select('_id')
  const { modifiedCount: usersGivenStudent } = await User.updateMany(
    { role: { $nin: roles.map(r => r._id) } },
    { $set: { role: student._id } }
  )

  const { modifiedCount: kpisUnlocked } = await KPI.updateMany(
    { isLocked: { $exists: false } },
    { $set: { isLocked: false, lockedBy: null, lockedAt: null } }
  )

  return { renamed, usersGivenStudent, kpisUnlocked }
}
