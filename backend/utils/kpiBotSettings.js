import KpiBotSettings from '../models/kpiBotSettings.js'
import { DEFAULT_GUIDANCE } from './kpiBotPrompt.js'

// Read fresh for each extraction: every server sees the next saved prompt.
// Already extracted candidates remain unchanged on retries.
export const getKpiBotSettings = async () => {
  const stored = await KpiBotSettings.findById('default').lean()
  return {
    guidance: stored?.guidance ?? DEFAULT_GUIDANCE,
    revision: stored?.revision ?? 0,
    updatedAt: stored?.updatedAt ?? null,
  }
}
