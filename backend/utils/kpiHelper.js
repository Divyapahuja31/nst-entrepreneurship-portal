import mongoose from 'mongoose'

import { uploadToS3 } from '../config/s3.js'
import KPI from '../models/kpi.js'
import KPIStatus from '../models/enums/KPIStatus.js'
import { findVentureForUser } from './founderHelper.js'

// Scores are out of 100; health thresholds and the overview chart assume it.
// Returns null when no score was sent and -1 when it is out of range.
export const parseEvaluationScore = score => {
  if (score === undefined || score === null || score === '') {
    return null
  }
  const num = Number(score)
  return Number.isFinite(num) && num >= 0 && num <= 100 ? num : -1
}

export const isValidKPIStatus = status =>
  status === undefined || Object.hasOwn(KPIStatus, status)

export const buildEvaluationFields = ({
  parsedScore,
  status,
  feedback,
  evaluatorId,
}) => {
  const fields = {}
  if (parsedScore !== null) {
    fields.score = parsedScore
  }
  if (status) {
    fields.status = status
    if (['GRADED', 'ACCEPTED', 'REJECTED'].includes(status)) {
      fields.evaluationDate = new Date()
    }
  }
  if (evaluatorId) {
    fields.evaluatedBy = evaluatorId
  }
  if (feedback !== undefined) {
    fields.feedback = String(feedback).trim()
  }
  return fields
}

const assignIfDefined = (target, key, val) => {
  if (val !== undefined) {
    target[key] = typeof val === 'string' ? val.trim() : val
  }
}

export const buildKPIUpdateFields = ({
  title,
  description,
  dueDate,
  status,
  targetValue,
  actualValue,
  founder,
}) => {
  const fields = {}
  assignIfDefined(fields, 'title', title)
  assignIfDefined(fields, 'description', description)
  if (dueDate !== undefined) {
    fields.dueDate = dueDate || null
  }
  assignIfDefined(fields, 'targetValue', targetValue)
  assignIfDefined(fields, 'actualValue', actualValue)
  if (founder !== undefined) {
    fields.founder = founder || null
    fields.scope = founder ? 'FOUNDER' : 'VENTURE'
  }
  if (status !== undefined) {
    const isSubmitting =
      status === 'SUBMIT' || status === 'WAITING_FOR_APPROVAL'
    fields.status = isSubmitting ? 'WAITING_FOR_APPROVAL' : status
    if (isSubmitting) {
      fields.submissionDate = new Date()
    }
  }
  return fields
}

export const resolveEvidenceData = async (
  file,
  currentEvidence = {},
  newSupportingText
) => {
  let fileUrl = currentEvidence?.fileUrl || ''
  let fileName = currentEvidence?.fileName || ''

  if (file) {
    fileUrl = await uploadToS3(file.buffer, file.originalname)
    fileName = file.originalname
  }

  const supportingText = newSupportingText
    ? newSupportingText.trim()
    : currentEvidence?.supportingText || ''
  return { fileUrl, fileName, supportingText, uploadedAt: new Date() }
}

// A KPI belongs to the startup (founder: null) or a specific member (founder: ID).
export const resolveKPIScope = ({ scope, founder }) => {
  if (founder && mongoose.Types.ObjectId.isValid(founder)) {
    return { scope: 'FOUNDER', founder }
  }

  if (scope === 'FOUNDER') {
    return { error: 'A member KPI needs a valid member ID' }
  }

  return { scope: 'VENTURE', founder: null }
}

export const checkKPILockStatus = kpi => {
  if (!kpi) {
    return null
  }
  if (kpi.status === 'GRADED') {
    return 'KPI has already been graded. Changes and submissions are locked.'
  }
  if (kpi.dueDate && new Date(kpi.dueDate) < new Date()) {
    return 'KPI deadline has passed. Submissions and edits are closed.'
  }
  return null
}

export const kpisVisibleTo = (ventureId, founderId) => ({
  venture: ventureId,
  $or: [{ founder: null }, { scope: 'VENTURE' }, { founder: founderId }],
})

export const canUserManageVentureKPI = async (user, ventureId) => {
  if (user?.role === 'admin') {
    return true
  }
  const userVenture = await findVentureForUser(user.id)
  return Boolean(
    userVenture && userVenture._id.toString() === ventureId.toString()
  )
}

const ownerId = founder => (founder ? String(founder._id ?? founder) : null)

// A personal KPI (assigned to one member) is private to that member: only
// they and admins may see or change it, matching what /kpis lists.
const isPersonalKPI = kpi => Boolean(kpi.founder) && kpi.scope !== 'VENTURE'

const isVentureMember = async (user, ventureId) => {
  const userVenture = await findVentureForUser(user?.id)
  return Boolean(userVenture) && String(userVenture._id) === String(ventureId)
}

export const canUserAccessKPI = async (user, kpi, allowCreator = false) => {
  if (user?.role === 'admin') {
    return true
  }
  if (isPersonalKPI(kpi)) {
    return ownerId(kpi.founder) === user?.id
  }
  if (await isVentureMember(user, kpi.venture)) {
    return true
  }
  return allowCreator && String(kpi.createdBy) === user?.id
}

// Members may create startup KPIs or personal KPIs for themselves. A KPI
// assigned to a teammate would be hidden from the member who created it.
export const kpiOwnerError = (user, founder) =>
  user.role !== 'admin' && founder && ownerId(founder) !== user.id
    ? 'You can only create personal KPIs for yourself'
    : null

// Members can't hand a KPI to someone else or take a startup KPI private,
// but may turn their own personal KPI into a startup KPI.
export const kpiOwnerChangeError = (user, kpi, founder) => {
  if (user.role === 'admin' || founder === undefined) {
    return null
  }
  const current = ownerId(kpi.founder)
  const requested = ownerId(founder || null)
  if (requested === current || (requested === null && current === user.id)) {
    return null
  }
  return 'Only admins can change who a KPI belongs to'
}

// Statuses in which members may still reshape or delete a KPI and its
// SubKPIs. Once accepted, it is what faculty signed off on (and graded KPIs
// carry a grade), so only an admin may change its parts or remove it.
export const EDITABLE_KPI_STATUSES = [
  'DRAFT',
  'WAITING_FOR_APPROVAL',
  'REJECTED',
]

export const isKPIOpenToMembers = (user, kpi) =>
  user?.role === 'admin' || EDITABLE_KPI_STATUSES.includes(kpi.status)

// A SubKPI may be changed by whoever may change its parent KPI, while that
// KPI is still open to members.
export const canUserEditSubKPI = async (user, subKPI) => {
  const parentKPI = await KPI.findById(subKPI.parentKPI)
  return (
    Boolean(parentKPI) &&
    isKPIOpenToMembers(user, parentKPI) &&
    canUserAccessKPI(user, parentKPI)
  )
}

export const buildNewKPIDocument = ({
  title,
  description,
  dueDate,
  venture,
  resolvedScope,
  status,
  userId,
}) => {
  const isSubmitted = status === 'SUBMIT' || status === 'WAITING_FOR_APPROVAL'
  return {
    title: title.trim(),
    description: description.trim(),
    dueDate: dueDate || null,
    venture,
    scope: resolvedScope.scope,
    founder: resolvedScope.founder,
    createdBy: userId,
    status: isSubmitted ? 'WAITING_FOR_APPROVAL' : 'DRAFT',
    submissionDate: isSubmitted ? new Date() : null,
  }
}

export const applyKPIProgress = (kpi, { actualValue, targetValue }) => {
  if (actualValue !== undefined) {
    kpi.actualValue = String(actualValue).trim()
  }
  if (targetValue !== undefined) {
    kpi.targetValue = String(targetValue).trim()
  }
}

export const buildEvidencePayload = ({
  supportingText,
  fileName,
  fileUrl,
}) => ({
  supportingText: supportingText ? String(supportingText).trim() : '',
  fileName: fileName ? String(fileName).trim() : '',
  fileUrl: fileUrl ? String(fileUrl).trim() : '',
  submittedAt: new Date(),
})

export const streamS3ToResponse = async (s3Data, res) => {
  if (s3Data.ContentType) {
    res.setHeader('Content-Type', s3Data.ContentType)
  }
  if (s3Data.ContentLength) {
    res.setHeader('Content-Length', s3Data.ContentLength)
  }

  if (typeof s3Data.Body?.pipe === 'function') {
    return s3Data.Body.pipe(res)
  }
  const buffer = Buffer.from(await s3Data.Body.transformToByteArray())
  return res.send(buffer)
}
