import mongoose from 'mongoose'
import { EVALUATION_TRANSITIONS, isStudent } from '@nst/shared/permissions.js'

import { uploadToS3 } from '../config/s3.js'
import KPIStatus from '../models/enums/KPIStatus.js'

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

const statusLabel = status => KPIStatus[status] ?? status

const statusChangeError = (kpi, status) => {
  if (!status || EVALUATION_TRANSITIONS[kpi.status]?.includes(status)) {
    return null
  }
  return `A ${statusLabel(kpi.status)} KPI can't be marked ${statusLabel(status)}`
}

const scoreError = (kpi, status, parsedScore) => {
  // The model defaults score to 0, so the first grade must send one.
  if (status === 'GRADED' && kpi.status !== 'GRADED' && parsedScore === null) {
    return 'A score is required to grade a KPI'
  }
  if (parsedScore !== null && (status ?? kpi.status) !== 'GRADED') {
    return 'Only a graded KPI has a score'
  }
  return null
}

// Returns why this evaluation can't be applied to the KPI, or null.
export const evaluationError = (kpi, { status, parsedScore, feedback }) => {
  if (feedback !== undefined && typeof feedback !== 'string') {
    return 'Feedback must be text'
  }
  return statusChangeError(kpi, status) || scoreError(kpi, status, parsedScore)
}

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

export const kpisVisibleTo = (ventureId, founderId) => ({
  venture: ventureId,
  $or: [{ founder: null }, { scope: 'VENTURE' }, { founder: founderId }],
})

const ownerId = founder => (founder ? String(founder._id ?? founder) : null)

// Students can't hand a KPI to someone else or take a startup KPI private,
// but may turn their own personal KPI into a startup KPI. Staff may
// reassign it to any member of the startup.
export const kpiOwnerChangeError = (user, kpi, founder) => {
  if (!isStudent(user) || founder === undefined) {
    return null
  }
  const current = ownerId(kpi.founder)
  const requested = ownerId(founder || null)
  if (requested === current || (requested === null && current === user.id)) {
    return null
  }
  return 'Only staff can change who a KPI belongs to'
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
