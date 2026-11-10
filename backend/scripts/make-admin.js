// Makes an existing account an admin. The app can't create the first admin,
// so this is how one is bootstrapped; later admins are made from the
// Accounts page. Usage: npm run make-admin -w backend -- you@newtonschool.co
import { ROLES } from '@nst/shared/permissions.js'
import AuditLog from '../models/auditLog.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import { runWithDatabase } from './connect.js'

const email = process.argv[2]?.toLowerCase().trim()

runWithDatabase(async () => {
  if (!email) {
    throw new Error('Usage: npm run make-admin -w backend -- <email>')
  }
  const [user, admin] = await Promise.all([
    User.findOne({ email, deletedAt: null }).populate('role', 'name'),
    Role.findOne({ name: ROLES.ADMIN }),
  ])
  if (!admin) {
    throw new Error('Run npm run migrate:rbac -w backend first')
  }
  if (!user) {
    throw new Error(`No active account for ${email}. Sign up first.`)
  }
  if (user.role?.name === ROLES.ADMIN) {
    console.info(`${email} is already an admin`)
    return
  }

  const previousRole = user.role?.name ?? null
  user.role = admin._id
  await user.save()
  await AuditLog.create({
    action: 'ROLE_CHANGED',
    actor: null,
    target: { id: user._id, email: user.email },
    previousRole,
    newRole: ROLES.ADMIN,
  })
  console.info(`${email} is now an admin`)
})
