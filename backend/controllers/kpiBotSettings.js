import KpiBotSettings from '../models/kpiBotSettings.js'
import { getKpiBotSettings } from '../utils/kpiBotSettings.js'
import {
  DEFAULT_GUIDANCE,
  MAX_GUIDANCE_LENGTH,
  protectedInstructions,
} from '../utils/kpiBotPrompt.js'

const metadata = {
  defaultGuidance: DEFAULT_GUIDANCE,
  maxLength: MAX_GUIDANCE_LENGTH,
  fixedInstructions: protectedInstructions('[meeting time zone]'),
}

export const readKpiBotSettings = async (_req, res) => {
  try {
    return res.json({ ...metadata, ...(await getKpiBotSettings()) })
  } catch {
    return res.status(500).json({ error: 'Could not load the KPI bot prompt' })
  }
}

export const updateKpiBotSettings = async (req, res) => {
  const { guidance, revision } = req.body ?? {}
  if (
    typeof guidance !== 'string' ||
    !guidance.trim() ||
    guidance.length > MAX_GUIDANCE_LENGTH
  ) {
    return res.status(400).json({
      error: `Enter recommendation guidance from 1 to ${MAX_GUIDANCE_LENGTH} characters.`,
    })
  }
  if (!Number.isSafeInteger(revision) || revision < 0) {
    return res.status(400).json({ error: 'Reload the prompt before saving.' })
  }
  try {
    const saved = await KpiBotSettings.findOneAndUpdate(
      { _id: 'default', revision },
      {
        $set: { guidance: guidance.trim(), updatedBy: req.user.id },
        $inc: { revision: 1 },
      },
      { upsert: revision === 0, returnDocument: 'after', runValidators: true }
    )
    if (!saved) {
      return res.status(409).json({
        error: 'Another admin changed the prompt. Reload it before saving.',
      })
    }
    return res.json({
      ...metadata,
      guidance: saved.guidance,
      revision: saved.revision,
      updatedAt: saved.updatedAt,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Another admin changed the prompt. Reload it before saving.',
      })
    }
    return res.status(500).json({ error: 'Could not save the KPI bot prompt' })
  }
}
