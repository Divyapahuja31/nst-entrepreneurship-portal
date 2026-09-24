import Step1 from './Proposal_steps/Step1.jsx'
import Step2 from './Proposal_steps/Step2.jsx'
import Step3 from './Proposal_steps/Step3.jsx'
import Step4 from './Proposal_steps/Step4.jsx'
import Step5 from './Proposal_steps/Step5.jsx'

export const steps = [
  { component: Step1 },
  { component: Step2 },
  { component: Step3 },
  { component: Step4 },
  { component: Step5 },
]

export const initialEmptyData = {
  // Step 1
  startupName: '',
  description: '',
  targetCustomer: '',
  industry: '',
  industryName: '',

  // Step 2
  stage: '',
  currentTraction: '',
  businessModel: '',
  achievementsTillNow: '',

  // Step 3
  assumption1: '',
  assumption2: '',
  assumption3: '',

  risk1: '',
  risk2: '',
  risk3: '',

  sixMonthGoals: '',

  // Step 4
  techStack: '',
  capitalStatus: '',
  weeklyHours: '',
  website: '',
}

export const getPrefilledData = proposal => {
  if (!proposal) return initialEmptyData

  return {
    startupName: proposal.startupName || '',
    description: proposal.description || '',
    targetCustomer: proposal.targetCustomer || '',
    industry: proposal.industry?._id || proposal.industry || '',
    industryName: proposal.industryName || proposal.industry?.name || '',

    stage: proposal.stage || '',
    currentTraction: proposal.currentTraction || '',
    businessModel: proposal.businessModel || '',
    achievementsTillNow: proposal.achievementsTillNow || '',

    assumption1: proposal.assumptions?.[0] || '',
    assumption2: proposal.assumptions?.[1] || '',
    assumption3: proposal.assumptions?.[2] || '',

    risk1: proposal.risks?.[0] || '',
    risk2: proposal.risks?.[1] || '',
    risk3: proposal.risks?.[2] || '',

    sixMonthGoals: proposal.sixMonthGoals || '',

    techStack: proposal.techStack || '',
    capitalStatus: proposal.capitalStatus || '',
    weeklyHours: proposal.weeklyHours !== undefined ? proposal.weeklyHours : '',
    website: proposal.website || '',
  }
}

// Flattens the stepper's per-field shape into the API's proposal payload.
export const FIELD_LIMITS = {
  // Step 1
  startupName: { maxChars: 50 },
  industryName: { maxChars: 50 },
  description: { maxChars: 650 },
  targetCustomer: { maxChars: 300 },

  // Step 2
  currentTraction: { maxChars: 500 },
  businessModel: { maxChars: 500 },
  achievementsTillNow: { maxChars: 500 },

  // Step 3
  assumption1: { maxChars: 100 },
  assumption2: { maxChars: 100 },
  assumption3: { maxChars: 100 },
  risk1: { maxChars: 100 },
  risk2: { maxChars: 100 },
  risk3: { maxChars: 100 },
  sixMonthGoals: { maxChars: 500 },

  // Step 4
  techStack: { maxChars: 300 },
  capitalStatus: { maxChars: 100 },
  weeklyHours: { min: 0, max: 168 },
  website: { maxChars: 100 },
}

export const STEP_FIELDS = [
  ['startupName', 'description', 'targetCustomer', 'industry'],
  ['stage', 'currentTraction', 'businessModel', 'achievementsTillNow'],
  [
    'assumption1',
    'assumption2',
    'assumption3',
    'risk1',
    'risk2',
    'risk3',
    'sixMonthGoals',
  ],
  ['techStack', 'capitalStatus', 'weeklyHours', 'website'],
]

export const normalizeWebsite = input => {
  if (!input || typeof input !== 'string') return ''
  const trimmed = input.trim()
  if (!trimmed) return ''
  const cleaned = trimmed.replace(/^(https?:\/\/)+/i, '')
  if (!cleaned) return ''
  return `https://${cleaned}`
}

export const isValidWebsite = input => {
  if (!input || typeof input !== 'string') return true
  const trimmed = input.trim()
  if (!trimmed) return true
  const cleaned = trimmed.replace(/^(https?:\/\/)+/i, '')
  const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/
  return domainPattern.test(cleaned)
}

export const validateField = (name, value, allData = {}) => {
  switch (name) {
    case 'startupName': {
      const v = value?.trim() || ''
      if (!v) return 'Startup name is required'
      if (v.length > FIELD_LIMITS.startupName.maxChars) {
        return `Startup name cannot exceed ${FIELD_LIMITS.startupName.maxChars} characters`
      }
      return ''
    }
    case 'description': {
      const v = value?.trim() || ''
      if (!v) return 'Problem description is required'
      if (v.length > FIELD_LIMITS.description.maxChars) {
        return `Description cannot exceed ${FIELD_LIMITS.description.maxChars} characters`
      }
      return ''
    }
    case 'targetCustomer': {
      const v = value?.trim() || ''
      if (!v) return 'Target customer is required'
      if (v.length > FIELD_LIMITS.targetCustomer.maxChars) {
        return `Target customer cannot exceed ${FIELD_LIMITS.targetCustomer.maxChars} characters`
      }
      return ''
    }
    case 'industry': {
      if (!allData.industry && !allData.industryName?.trim()) {
        return 'Industry is required'
      }
      if (
        allData.industryName?.trim() &&
        allData.industryName.trim().length > FIELD_LIMITS.industryName.maxChars
      ) {
        return `Industry name cannot exceed ${FIELD_LIMITS.industryName.maxChars} characters`
      }
      return ''
    }
    case 'stage': {
      if (!value) return 'Current stage is required'
      return ''
    }
    case 'currentTraction': {
      const v = value?.trim() || ''
      if (!v) return 'Current traction is required'
      if (v.length > FIELD_LIMITS.currentTraction.maxChars) {
        return `Current traction cannot exceed ${FIELD_LIMITS.currentTraction.maxChars} characters`
      }
      return ''
    }
    case 'businessModel': {
      const v = value?.trim() || ''
      if (!v) return 'Business model is required'
      if (v.length > FIELD_LIMITS.businessModel.maxChars) {
        return `Business model cannot exceed ${FIELD_LIMITS.businessModel.maxChars} characters`
      }
      return ''
    }
    case 'achievementsTillNow': {
      const v = value?.trim() || ''
      if (v.length > FIELD_LIMITS.achievementsTillNow.maxChars) {
        return `Achievements cannot exceed ${FIELD_LIMITS.achievementsTillNow.maxChars} characters`
      }
      return ''
    }
    case 'assumption1':
    case 'assumption2':
    case 'assumption3': {
      const num = name.slice(-1)
      const v = value?.trim() || ''
      if (!v) return `Assumption ${num} is required`
      if (v.length > FIELD_LIMITS[name].maxChars) {
        return `Assumption ${num} cannot exceed ${FIELD_LIMITS[name].maxChars} characters`
      }
      return ''
    }
    case 'risk1':
    case 'risk2':
    case 'risk3': {
      const num = name.slice(-1)
      const v = value?.trim() || ''
      if (!v) return `Risk ${num} is required`
      if (v.length > FIELD_LIMITS[name].maxChars) {
        return `Risk ${num} cannot exceed ${FIELD_LIMITS[name].maxChars} characters`
      }
      return ''
    }
    case 'sixMonthGoals': {
      const v = value?.trim() || ''
      if (!v) return 'Six-month goals are required'
      if (v.length > FIELD_LIMITS.sixMonthGoals.maxChars) {
        return `Six-month goals cannot exceed ${FIELD_LIMITS.sixMonthGoals.maxChars} characters`
      }
      return ''
    }
    case 'techStack': {
      const v = value?.trim() || ''
      if (!v) return 'Tech stack is required'
      if (v.length > FIELD_LIMITS.techStack.maxChars) {
        return `Tech stack cannot exceed ${FIELD_LIMITS.techStack.maxChars} characters`
      }
      return ''
    }
    case 'capitalStatus': {
      const v = value?.trim() || ''
      if (!v) return 'Capital status is required'
      if (v.length > FIELD_LIMITS.capitalStatus.maxChars) {
        return `Capital status cannot exceed ${FIELD_LIMITS.capitalStatus.maxChars} characters`
      }
      return ''
    }
    case 'weeklyHours': {
      if (
        value === '' ||
        value === null ||
        value === undefined ||
        isNaN(Number(value)) ||
        Number(value) < FIELD_LIMITS.weeklyHours.min ||
        Number(value) > FIELD_LIMITS.weeklyHours.max
      ) {
        return `Weekly hours must be a number between ${FIELD_LIMITS.weeklyHours.min} and ${FIELD_LIMITS.weeklyHours.max}`
      }
      return ''
    }
    case 'website': {
      const v = value?.trim() || ''
      if (v) {
        if (v.length > FIELD_LIMITS.website.maxChars) {
          return `Website URL cannot exceed ${FIELD_LIMITS.website.maxChars} characters`
        }
        if (!isValidWebsite(v)) {
          return 'Please enter a valid website URL (e.g. example.com or https://example.com)'
        }
      }
      return ''
    }
    default:
      return ''
  }
}

export const validateStep = (stepIndex, data) => {
  const currentStepFields = STEP_FIELDS[stepIndex] || []
  const stepErrors = {}

  for (const field of currentStepFields) {
    const error = validateField(field, data[field], data)
    if (error) {
      stepErrors[field] = error
    }
  }

  return stepErrors
}

export const validateForm = data => {
  const errs = {}
  for (const field of STEP_FIELDS.flat()) {
    const error = validateField(field, data[field], data)
    if (error) {
      errs[field] = error
    }
  }
  return errs
}

export const buildProposalPayload = data => ({
  ...data,
  startupName: data.startupName?.trim() || '',
  description: data.description?.trim() || '',
  targetCustomer: data.targetCustomer?.trim() || '',
  stage: data.stage,
  currentTraction: data.currentTraction?.trim() || '',
  businessModel: data.businessModel?.trim() || '',
  achievementsTillNow: data.achievementsTillNow ? data.achievementsTillNow.trim() : '',
  assumptions: [data.assumption1, data.assumption2, data.assumption3]
    .map(a => a?.trim())
    .filter(Boolean),
  risks: [data.risk1, data.risk2, data.risk3]
    .map(r => r?.trim())
    .filter(Boolean),
  sixMonthGoals: data.sixMonthGoals?.trim() || '',
  techStack: data.techStack?.trim() || '',
  capitalStatus: data.capitalStatus?.trim() || '',
  weeklyHours: Number(data.weeklyHours),
  website: data.website?.trim() ? normalizeWebsite(data.website) : undefined,
  industry: data.industry || undefined,
  industryName: data.industry
    ? undefined
    : data.industryName?.trim() || undefined,
})
