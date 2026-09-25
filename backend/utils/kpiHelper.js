import mongoose from 'mongoose'

import { uploadToS3 } from '../config/s3.js'
import { findVentureForUser } from './founderHelper.js'

export const parseEvaluationScore = score => {
  if (score === undefined || score === null || score === '') {
    return null
  }
  const num = Number(score)
  return !Number.isNaN(num) && num >= 0 ? num : -1
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
    fileUrl = await uploadToS3(file.buffer, file.originalname, file.mimetype)
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

const isFounderOrCreator = (kpi, userId, allowCreator) => {
  if (kpi.scope === 'FOUNDER' && kpi.founder?.toString() === userId) {
    return true
  }
  return Boolean(allowCreator && kpi.createdBy?.toString() === userId)
}

export const canUserAccessKPI = async (user, kpi, allowCreator = false) => {
  if (user?.role === 'admin') {
    return true
  }
  const userVenture = await findVentureForUser(user?.id)
  if (userVenture && userVenture._id.toString() === kpi.venture.toString()) {
    return true
  }
  return isFounderOrCreator(kpi, user?.id, allowCreator)
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
