import startupStage from '../models/enums/startupStage.js'

const REQUIRED_STRING_FIELDS = [
  { field: 'startupName', message: 'Startup name is required' },
  { field: 'description', message: 'Problem description is required' },
  { field: 'targetCustomer', message: 'Target customer is required' },
  { field: 'currentTraction', message: 'Current traction is required' },
  { field: 'businessModel', message: 'Business model is required' },
  { field: 'sixMonthGoals', message: 'Six-month goals are required' },
  { field: 'techStack', message: 'Tech stack is required' },
  { field: 'capitalStatus', message: 'Capital status is required' },
]

const validateStrings = body => {
  for (const item of REQUIRED_STRING_FIELDS) {
    if (!body[item.field]?.trim()) {
      return item.message
    }
  }
  return null
}

const validateIndustryAndStage = body => {
  if (!body.industry && !body.industryName?.trim()) {
    return 'Industry is required'
  }
  if (!body.stage || !Object.keys(startupStage).includes(body.stage)) {
    return 'A valid startup stage is required'
  }
  return null
}

const validateArraysAndHours = body => {
  if (
    !Array.isArray(body.assumptions) ||
    body.assumptions.filter(Boolean).length === 0
  ) {
    return 'Assumptions are required'
  }
  if (!Array.isArray(body.risks) || body.risks.filter(Boolean).length === 0) {
    return 'Risks are required'
  }
  if (
    body.weeklyHours === undefined ||
    body.weeklyHours === null ||
    isNaN(Number(body.weeklyHours)) ||
    Number(body.weeklyHours) < 0
  ) {
    return 'Weekly hours must be a valid non-negative number'
  }
  return null
}

export const validateProposalInput = body => {
  return (
    validateStrings(body) ||
    validateIndustryAndStage(body) ||
    validateArraysAndHours(body)
  )
}

export const buildProposalData = (body, userId, campusId) => {
  return {
    startupName: body.startupName.trim(),
    description: body.description.trim(),
    targetCustomer: body.targetCustomer.trim(),
    stage: body.stage,
    currentTraction: body.currentTraction.trim(),
    businessModel: body.businessModel.trim(),
    assumptions: body.assumptions.map(a => a.trim()).filter(Boolean),
    risks: body.risks.map(r => r.trim()).filter(Boolean),
    sixMonthGoals: body.sixMonthGoals.trim(),
    techStack: body.techStack.trim(),
    capitalStatus: body.capitalStatus.trim(),
    weeklyHours: Number(body.weeklyHours),
    website: body.website?.trim() || undefined,
    submittedBy: userId,
    campus: campusId,
    status: 'PENDING',
    industry: body.industry || undefined,
    industryName: body.industry
      ? undefined
      : body.industryName?.trim() || undefined,
  }
}
