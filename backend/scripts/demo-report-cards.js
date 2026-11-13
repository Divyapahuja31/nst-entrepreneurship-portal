import { ROLES } from '@nst/shared/permissions.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import { seedReportCardTemplates } from '../seed/reportCardTemplates.js'
import { DEFAULT_EMAIL_DOMAINS, domainOf } from '../utils/emailDomains.js'
import { validateEmail } from '../utils/validator.js'
import { runPortalDemo } from './portal-demo.js'

const accounts = [
  {
    username: 'Demo Admin',
    role: ROLES.ADMIN,
    emailVariable: 'DEMO_ADMIN_EMAIL',
    staff: true,
  },
  {
    username: 'Asha Patel',
    role: ROLES.STUDENT,
    emailVariable: 'DEMO_STUDENT_EMAIL',
    staff: false,
  },
]

const demoEmail = ({ emailVariable, role, staff }) => {
  const { domain } = DEFAULT_EMAIL_DOMAINS.find(entry => entry.staff === staff)
  const email = (
    process.env[emailVariable] ?? `report-card-demo-${role}@${domain}`
  )
    .trim()
    .toLowerCase()
  if (validateEmail(email) || domainOf(email) !== domain) {
    throw new Error(
      `${emailVariable} must be a valid @${domain} email address.`
    )
  }
  return email
}

await runPortalDemo({
  title: 'Report card demo',
  seed: async password => {
    const demoUsers = accounts.map(account => ({
      username: account.username,
      role: account.role,
      email: demoEmail(account),
    }))
    await seedReportCardTemplates()

    const roles = new Map(
      (await Role.find().lean()).map(role => [role.name, role._id])
    )
    await User.create(
      demoUsers.map(account => ({
        ...account,
        role: roles.get(account.role),
        password,
        isEmailVerified: true,
      }))
    )

    return demoUsers.map(account => [account.role, account.email])
  },
})
