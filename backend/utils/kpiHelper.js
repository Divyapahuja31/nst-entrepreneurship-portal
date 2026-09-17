import mongoose from 'mongoose'

import { uploadToS3 } from '../config/s3.js'

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
}) => {
  const fields = {}
  assignIfDefined(fields, 'title', title)
  assignIfDefined(fields, 'description', description)
  if (dueDate !== undefined) {
    fields.dueDate = dueDate || null
  }
  assignIfDefined(fields, 'targetValue', targetValue)
  assignIfDefined(fields, 'actualValue', actualValue)
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

// A KPI is either venture-wide or tied to one founder. Returns the fields to
// store, or an error message when the two inputs disagree.
export const resolveKPIScope = ({ scope, founder }) => {
  if (scope !== 'FOUNDER') {
    return { scope: 'VENTURE', founder: null }
  }

  if (!mongoose.Types.ObjectId.isValid(founder)) {
    return { error: 'A founder KPI needs a valid founder' }
  }

  return { scope: 'FOUNDER', founder }
}
