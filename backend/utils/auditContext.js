import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

const storage = new AsyncLocalStorage()

export const auditContext = () => storage.getStore()
export const resumeAuditContext = (context, task) => storage.run(context, task)

export const withAuditContext = (context, task) =>
  storage.run(
    {
      requestId: randomUUID(),
      source: 'system',
      captureChanges: true,
      sequence: 0,
      ...context,
    },
    async () => await task()
  )

export const identifyAuditActor = user => {
  const context = auditContext()
  if (context && user) {
    context.actor = {
      id: String(user._id ?? user.id),
      role: user.role?.name ?? user.role,
    }
  }
}
