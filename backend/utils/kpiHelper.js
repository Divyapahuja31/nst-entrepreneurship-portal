import { uploadToS3 } from '../config/s3.js'

export const parseEvaluationScore = score => {
  if (score === undefined || score === null || score === '') {
    return null
  }
  const num = Number(score)
  return !Number.isNaN(num) && num >= 0 ? num : -1
}

export const applyKpiEvaluationUpdates = (
  kpi,
  { parsedScore, status, feedback, evaluatorId }
) => {
  if (parsedScore !== null) {
    kpi.score = parsedScore
  }
  if (status) {
    kpi.status = status
    if (status === 'GRADED') {
      kpi.evaluationDate = new Date()
    }
  }
  kpi.evaluatedBy = evaluatorId
  if (feedback !== undefined) {
    kpi.feedback = String(feedback).trim()
  }
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
