import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { ROLES } from '@nst/shared/permissions.js'

import { useAuthStore } from './auth'

// The batch an admin is looking at (the picker in the header), or null for
// every batch. It narrows the staff lists: Overview, Startups, Founders,
// KPIs and Accounts.
export const useBatchStore = create(
  persist(
    set => ({
      batchId: null,
      setBatch: batchId => set({ batchId: batchId || null }),
    }),
    {
      name: 'nst-admin-batch',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// Signing out (or in as someone else) starts again from every batch.
const userIdOf = state => String(state.user?._id ?? state.user?.id ?? '')
useAuthStore.subscribe((next, previous) => {
  if (userIdOf(next) !== userIdOf(previous)) {
    useBatchStore.getState().setBatch(null)
  }
})

const isAdmin = () => useAuthStore.getState().user?.role?.name === ROLES.ADMIN

// Whether the admin's lists are narrowed to one batch, for empty states.
export const useBatchChosen = () =>
  Boolean(useBatchStore(state => state.batchId)) && isAdmin()

// The query params for the chosen batch: { batch } or {}.
export const batchParams = () => {
  const { batchId } = useBatchStore.getState()
  return batchId && isAdmin() ? { batch: batchId } : {}
}

// Runs request(params) with the chosen batch. These lists answer 400 only
// for a batch that no longer exists (removed in School Setup), so then the
// batch is cleared and the request is made for every batch.
export const withBatch = async request => {
  const params = batchParams()
  if (!params.batch) {
    return request({})
  }
  try {
    return await request(params)
  } catch (err) {
    if (err.response?.status !== 400) {
      throw err
    }
    useBatchStore.getState().setBatch(null)
    return request({})
  }
}
