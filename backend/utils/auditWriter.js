// The queue is process-local. Stable event IDs make a retry safe after a
// partial insert or an ambiguous network failure.
export function createAuditWriter({
  write,
  capacity = 2000,
  batchSize = 100,
  interval = 250,
  report = counters =>
    console.error(
      JSON.stringify({
        event: 'audit_writer_issue',
        time: new Date().toISOString(),
        ...counters,
      })
    ),
}) {
  const queue = []
  const counters = { accepted: 0, written: 0, failed: 0, dropped: 0 }
  let timer
  let active
  let inFlight = 0
  let lastReportedAt = 0

  const notify = () => {
    const now = Date.now()
    if (now - lastReportedAt < 10000) {
      return
    }
    lastReportedAt = now
    try {
      report({ ...counters, pending: queue.length + inFlight })
    } catch {
      // Diagnostics must not make persistence failures escape the writer.
    }
  }

  const persist = async batch => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await write(batch)
        counters.written += batch.length
        return
      } catch {
        counters.failed++
      }
    }
    counters.dropped += batch.length
    notify()
  }

  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    active ??= (async () => {
      while (queue.length) {
        const batch = queue.splice(0, batchSize)
        inFlight = batch.length
        await persist(batch)
        inFlight = 0
      }
    })().finally(() => {
      active = undefined
    })
    return active
  }

  return {
    enqueue(event) {
      if (queue.length + inFlight >= capacity) {
        counters.dropped++
        if (counters.dropped === 1 || counters.dropped % 100 === 0) {
          notify()
        }
        return false
      }
      queue.push(event)
      counters.accepted++
      timer ??= setTimeout(() => {
        void flush()
      }, interval)
      timer.unref()
      return true
    },
    flush,
    stats: () => ({ ...counters, pending: queue.length + inFlight }),
  }
}
