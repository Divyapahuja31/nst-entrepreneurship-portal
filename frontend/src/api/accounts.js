import { api } from './client'
import toError from './toError'

// The Accounts & Roles page: accounts, the activity log and the batch and
// campus choices a new student account needs.
export const accountsLoader = async () => {
  const [accounts, auditLog, options] = await Promise.all([
    api.get('/admin/accounts'),
    api.get('/admin/accounts/audit-log'),
    api.get('/auth/google/signup-options'),
  ])
  return {
    accounts: accounts.data.accounts,
    adminCount: accounts.data.adminCount,
    entries: auditLog.data.entries,
    batches: options.data.batches,
    campuses: options.data.campuses,
  }
}

export const createAccount = async payload => {
  try {
    const { data } = await api.post('/admin/accounts', payload)
    return { account: data.account }
  } catch (err) {
    return toError(err, 'Could not create the account')
  }
}

export const changeAccountRole = async (userId, role) => {
  try {
    const { data } = await api.patch(`/admin/accounts/${userId}/role`, {
      role,
    })
    return { account: data.account }
  } catch (err) {
    return toError(err, 'Could not change the role')
  }
}

export const deactivateAccount = async userId => {
  try {
    const { data } = await api.delete(`/admin/accounts/${userId}`)
    return { account: data.account }
  } catch (err) {
    return toError(err, 'Could not deactivate the account')
  }
}
