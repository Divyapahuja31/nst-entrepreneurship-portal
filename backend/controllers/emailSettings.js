import { canManageEmails } from '@nst/shared/permissions.js'

import EmailSettings from '../models/emailSettings.js'
import {
  DEFAULT_BRAND,
  DEFAULT_RULES,
  EMAIL_CATALOG,
  catalogEntry,
  loadEmailSettings,
  parseEmailSettings,
  resolveEmailSettings,
} from '../utils/emailSettings.js'
import { EMAIL_PREVIEWS } from '../utils/emailTemplates/previews.js'
import { normalizeFrom } from '../utils/emailProvider.js'

// The admin's Emails page: who emails come from, their header and footer,
// when KPI alerts go out, and each email's wording.

const forbidden = res =>
  res.status(403).json({ error: 'Only admins change the emails' })

// The address emails are sent from. Only its name can be changed here.
const senderAddress = () => {
  const from = normalizeFrom(process.env.EMAIL_FROM)
  return from?.match(/<([^<>]+)>$/)?.[1] ?? from ?? null
}

// What the page needs: the settings as they are now (defaults filled in),
// the defaults to reset to, and what each email lets an admin change.
const pageData = settings => ({
  settings,
  defaults: {
    brand: DEFAULT_BRAND,
    rules: DEFAULT_RULES,
  },
  senderAddress: senderAddress(),
  emails: EMAIL_CATALOG.map(entry => ({
    key: entry.key,
    label: entry.label,
    description: entry.description,
    canDisable: entry.canDisable,
    usesScore: Boolean(entry.usesScore),
    placeholders: Object.entries(entry.placeholders).map(
      ([name, description]) => ({ name, description })
    ),
    fields: Object.entries(entry.fields).map(([name, field]) => ({
      name,
      label: field.label,
      default: field.default,
      multiline: Boolean(field.multiline),
    })),
  })),
})

export const getEmailSettings = async (req, res) => {
  try {
    if (!canManageEmails(req.user)) {
      return forbidden(res)
    }
    return res.json(pageData(await loadEmailSettings()))
  } catch (error) {
    console.error('Error loading email settings:', error)
    return res.status(500).json({ error: 'Could not load the email settings' })
  }
}

export const saveEmailSettings = async (req, res) => {
  try {
    if (!canManageEmails(req.user)) {
      return forbidden(res)
    }
    const parsed = parseEmailSettings(req.body ?? {})
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error, field: parsed.field })
    }
    const saved = await EmailSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: { ...parsed.value, updatedBy: req.user.id } },
      { upsert: true, returnDocument: 'after', lean: true }
    )
    return res.json(pageData(resolveEmailSettings(saved)))
  } catch (error) {
    console.error('Error saving email settings:', error)
    return res.status(500).json({ error: 'Could not save the email settings' })
  }
}

const clampScore = value => {
  const score = Number(value)
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 65
}

// One email with sample data, built from the page's unsaved settings.
export const previewEmail = async (req, res) => {
  try {
    if (!canManageEmails(req.user)) {
      return forbidden(res)
    }
    const { key, score, settings } = req.body ?? {}
    const preview = catalogEntry(key) && EMAIL_PREVIEWS[key]
    if (!preview) {
      return res.status(404).json({ error: 'No such email' })
    }
    const parsed = parseEmailSettings(settings ?? {})
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error, field: parsed.field })
    }
    const email = preview.render(
      clampScore(score),
      resolveEmailSettings(parsed.value)
    )
    return res.json({ subject: email.subject, html: email.html })
  } catch (error) {
    console.error('Error previewing an email:', error)
    return res.status(500).json({ error: 'Could not preview the email' })
  }
}
