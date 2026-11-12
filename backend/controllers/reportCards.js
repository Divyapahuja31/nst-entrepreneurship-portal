import mongoose from 'mongoose'
import { ROLES } from '@nst/shared/permissions.js'
import {
  REPORT_CARD_LIMITS as limits,
  REPORT_CARD_PATH,
  filledReportRows,
  gradeLayoutError,
  gradedReportError,
  normalizeGradeLayout,
  reportAssessments,
  validReportColumns,
} from '@nst/shared/reportCards.js'

import ReportCard from '../models/reportCard.js'
import ReportCardTemplate from '../models/reportCardTemplate.js'
import Role from '../models/role.js'
import User from '../models/user.js'
import { sendReportCardPublished } from '../utils/emailService.js'
import { appUrl } from '../utils/kpiLockEmails.js'

const studentFields = 'username email'
const reportFields = 'draft published.publishedAt revision'
const templateFields = 'name columns layout'
const trimmed = value => (typeof value === 'string' ? value.trim() : '')
const validText = (value, max) => value.length > 0 && value.length <= max

const readReportFormat = (rawColumns, layout) => {
  if (layout !== undefined) {
    const error = gradeLayoutError(layout)
    if (error) {
      return { error }
    }
    const normalized = normalizeGradeLayout(layout)
    return {
      layout: normalized,
      columns: [
        'Subject',
        ...reportAssessments(normalized).map(item => item.name),
      ],
    }
  }
  const columns = Array.isArray(rawColumns) ? rawColumns.map(trimmed) : []
  return validReportColumns(columns)
    ? { columns }
    : { error: 'Enter a unique name for each column.' }
}

const templateList = () =>
  ReportCardTemplate.find().select(templateFields).sort({ name: 1 }).lean()

const studentFilter = async () => {
  const role = await Role.findOne({ name: ROLES.STUDENT }).select('_id').lean()
  return { role: role?._id, deletedAt: null }
}

export const loadStudent = async (req, res, next) => {
  const { studentId } = req.params
  if (!mongoose.isObjectIdOrHexString(studentId)) {
    return res.status(404).json({ error: 'Student not found' })
  }

  const filter = await studentFilter()
  const student = filter.role
    ? await User.findOne({ ...filter, _id: studentId })
        .select(studentFields)
        .lean()
    : null
  if (!student) {
    return res.status(404).json({ error: 'Student not found' })
  }

  res.locals.student = student
  return next()
}

export const listReportCardOptions = async (_req, res) => {
  const filter = await studentFilter()
  const [students, templates] = await Promise.all([
    filter.role
      ? User.find(filter)
          .select(studentFields)
          .sort({ username: 1, email: 1 })
          .lean()
      : [],
    templateList(),
  ])
  return res.json({ students, templates })
}

export const createTemplate = async (req, res) => {
  const name = trimmed(req.body?.name)
  if (!validText(name, limits.title)) {
    return res.status(400).json({ error: 'Enter a template name.' })
  }
  const { error, ...format } = readReportFormat(
    req.body?.columns,
    req.body?.layout
  )
  if (error) {
    return res.status(400).json({ error })
  }

  const template = await ReportCardTemplate.create({ name, ...format })
  return res.status(201).json({
    template: {
      _id: template._id,
      name: template.name,
      ...format,
    },
  })
}

export const getStudentReportCard = async (_req, res) => {
  const student = res.locals.student
  const card = await ReportCard.findById(student._id)
    .select(reportFields)
    .lean()
  return res.json({
    student,
    card,
    templates: card ? [] : await templateList(),
  })
}

export const createReportCard = async (req, res) => {
  const { templateId } = req.body ?? {}
  const template = mongoose.isObjectIdOrHexString(templateId)
    ? await ReportCardTemplate.findById(templateId)
        .select(templateFields)
        .lean()
    : null
  if (!template) {
    return res.status(400).json({ error: 'Choose an existing template.' })
  }

  try {
    const { draft, published, revision } = await ReportCard.create({
      _id: res.locals.student._id,
      draft: {
        title: template.name,
        columns: template.columns,
        layout: template.layout,
        rows: (template.layout?.subjects ?? []).map(({ name }) => [
          name,
          ...template.columns.slice(1).map(() => ''),
        ]),
      },
    })
    return res.status(201).json({ card: { draft, published, revision } })
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: 'A report card already exists. Refresh to open it.' })
    }
    throw err
  }
}

const validRows = (rows, width) =>
  Array.isArray(rows) &&
  rows.length <= limits.rows &&
  rows.every(
    row =>
      Array.isArray(row) &&
      row.length === width &&
      row.every(cell => typeof cell === 'string' && cell.length <= limits.cell)
  )

const validRevision = revision =>
  Number.isSafeInteger(revision) && revision >= 0

const readReportUpdate = ({
  title: rawTitle,
  columns: rawColumns,
  layout,
  revision,
  rows,
  publish,
}) => {
  const title = trimmed(rawTitle)
  if (!validText(title, limits.title)) {
    return { error: 'Enter a report title.' }
  }
  if (!validRevision(revision) || typeof publish !== 'boolean') {
    return { error: 'Invalid report update.' }
  }
  const { error, ...format } = readReportFormat(rawColumns, layout)
  if (error) {
    return { error }
  }
  if (!validRows(rows, format.columns.length)) {
    return { error: 'Check the number of cells and the length of each entry.' }
  }

  return {
    draft: { title, ...format, rows: rows.map(row => row.map(trimmed)) },
    revision,
    publish,
  }
}

export const saveReportCard = async (req, res) => {
  const student = res.locals.student
  const id = student._id
  const { draft, revision, publish, error } = readReportUpdate(req.body ?? {})
  if (error) {
    return res.status(400).json({ error })
  }

  const update = { draft }
  if (publish) {
    const rows = filledReportRows(draft.rows)
    const publicationError = draft.layout
      ? gradedReportError(draft.layout, rows)
      : !rows.length && 'Fill in at least one row before publishing.'
    if (publicationError) {
      return res.status(400).json({ error: publicationError })
    }

    update.published = { ...draft, rows, publishedAt: new Date() }
  }

  // Draft and publication are stored together so a publish is atomic.
  const saved = await ReportCard.findOneAndUpdate(
    { _id: id, revision },
    { $set: update, $inc: { revision: 1 } },
    { returnDocument: 'after' }
  )
    .select(reportFields)
    .lean()
  if (!saved) {
    if (!(await ReportCard.exists({ _id: id }))) {
      return res.status(404).json({ error: 'Create a report card first.' })
    }
    return res.status(409).json({
      error:
        'This card changed in another session. Refresh to see the latest version.',
    })
  }
  if (publish) {
    await sendReportCardPublished({
      recipient: { email: student.email, userId: id },
      recipientName: student.username,
      reportUrl: appUrl() + REPORT_CARD_PATH,
      dedupeKey: `report-card:${id}:revision:${saved.revision}`,
    }).catch(error => {
      // The report is already published. Delivery has its own failure log.
      console.error('Report card email not sent:', error.message)
    })
  }
  return res.json({ card: saved })
}

export const getMyReportCard = async (req, res) => {
  if (req.user.role !== ROLES.STUDENT) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const card = await ReportCard.findById(req.user.id).select('published').lean()
  return res
    .set('Cache-Control', 'no-store')
    .json({ report: card?.published ?? null })
}
