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
    industryName: proposal.industryName || '',

    stage: proposal.stage || '',
    currentTraction: proposal.currentTraction || '',
    businessModel: proposal.businessModel || '',

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
export const buildProposalPayload = data => ({
  ...data,

  assumptions: [data.assumption1, data.assumption2, data.assumption3].filter(
    Boolean
  ),

  risks: [data.risk1, data.risk2, data.risk3].filter(Boolean),

  weeklyHours: Number(data.weeklyHours),
})
