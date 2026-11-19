// Stable IDs preserve answers when an administrator changes a label or order.
export const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'checkbox',
  'heading',
  'paragraph',
  'url',
]
export const BUILTIN_FIELDS = {
  progress_summary: ['Progress summary', 'textarea'],
  wins: ['Wins', 'textarea'],
  blockers: ['Blockers', 'textarea'],
  hours_worked: ['Hours worked', 'number'],
  customer_interviews: ['Customer interviews', 'number'],
  features_shipped: ['Features shipped', 'number'],
  revenue: ['Revenue', 'number'],
  users_acquired: ['Users acquired', 'number'],
  experiments_run: ['Experiments run', 'number'],
  mentor_meeting_date: ['Mentor meeting date', 'date'],
  mentor_meeting_notes: ['Mentor meeting notes', 'textarea'],
  goals_next_cycle: ['Goals for next cycle', 'textarea'],
  ask_for_help: ['Ask for help', 'textarea'],
}
export const defaultBiweeklyForm = () => ({
  title: 'Biweekly Progress Report',
  description: 'Share your progress and goals for this startup.',
  blocks: Object.entries(BUILTIN_FIELDS).map(([id, [label, type]]) => ({
    id,
    label,
    type,
    required: id === 'progress_summary',
    description: '',
    options: [],
  })),
})
const text = (value, max) => typeof value === 'string' && value.length <= max
const validChoices = options =>
  Array.isArray(options) &&
  options.length > 0 &&
  options.length <= 30 &&
  options.every(o => text(o, 150) && o.trim()) &&
  new Set(options).size === options.length
const validId = id =>
  text(id, 80) &&
  /^[a-z][a-z0-9_]*$/.test(id) &&
  !['constructor', 'prototype', '__proto__'].includes(id)
const validBlockText = b =>
  FIELD_TYPES.includes(b.type) &&
  text(b.label, 500) &&
  b.label.trim() &&
  text(b.description, 2000) &&
  typeof b.required === 'boolean'
const blockError = b => {
  if (!b || !validId(b.id)) {
    return 'Each block needs a unique, valid ID.'
  }
  if (!validBlockText(b)) {
    return 'Check each block’s text and input type.'
  }
  if (BUILTIN_FIELDS[b.id] && b.type !== BUILTIN_FIELDS[b.id][1]) {
    return 'Standard report fields must retain their input type.'
  }
  if (b.type === 'select' && !validChoices(b.options)) {
    return 'Choice questions need 1–30 unique options.'
  }
  return null
}
const validHeader = form =>
  form &&
  text(form.title, 150) &&
  form.title.trim() &&
  text(form.description, 2000)
const validBlocks = blocks =>
  Array.isArray(blocks) && blocks.length > 0 && blocks.length <= 60
export const validateForm = form => {
  if (!validHeader(form) || !validBlocks(form.blocks)) {
    return 'Add a title and between 1 and 60 blocks.'
  }
  const seen = new Set()
  for (const b of form.blocks) {
    const error = blockError(b)
    if (error) {
      return error
    }
    if (seen.has(b.id)) {
      return 'Each block needs a unique, valid ID.'
    }
    seen.add(b.id)
  }
  return null
}
export const cleanForm = form => ({
  title: form.title.trim(),
  description: form.description.trim(),
  blocks: form.blocks.map(b => ({
    id: b.id,
    type: b.type,
    label: b.label.trim(),
    description: b.description.trim(),
    required: !['heading', 'paragraph'].includes(b.type) && b.required,
    options: b.type === 'select' ? b.options.map(o => o.trim()) : [],
  })),
})
const validDate = v =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v
const validUrl = v => {
  try {
    return ['http:', 'https:'].includes(new URL(v).protocol)
  } catch {
    return false
  }
}
const numberError = (b, v) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0
    ? null
    : `${b.label} must be a number of 0 or more.`
const checkboxError = (b, v) =>
  typeof v === 'boolean' ? null : `${b.label} must be checked or unchecked.`
const inputError = (b, v) => {
  if (b.type === 'number') {
    return numberError(b, v)
  }
  if (b.type === 'checkbox') {
    return checkboxError(b, v)
  }
  if (!text(v, 10000)) {
    return `${b.label} must be text of at most 10000 characters.`
  }
  if (b.type === 'select' && !b.options.includes(v)) {
    return `Choose a listed option for ${b.label}.`
  }
  if (b.type === 'date' && !validDate(v)) {
    return `${b.label} must be a valid date.`
  }
  if (b.type === 'url' && !validUrl(v)) {
    return `${b.label} must be a web address.`
  }
  return null
}
const emptyValue = v =>
  v === undefined ||
  v === null ||
  v === '' ||
  (typeof v === 'string' && !v.trim())
const answerError = (b, v, submit) => {
  const empty = emptyValue(v)
  if (
    submit &&
    b.required &&
    (empty || (b.type === 'checkbox' && v !== true))
  ) {
    return `${b.label} is required.`
  }
  return empty ? null : inputError(b, v)
}
export const validateAnswers = (form, answers, submit) => {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return 'Answers must be an object.'
  }
  const fields = form.blocks.filter(
    b => !['heading', 'paragraph'].includes(b.type)
  )
  if (Object.keys(answers).some(id => !fields.some(b => b.id === id))) {
    return 'The form contains unknown answers. Reload before saving.'
  }
  for (const b of fields) {
    const error = answerError(b, answers[b.id], submit)
    if (error) {
      return error
    }
  }
  return null
}
