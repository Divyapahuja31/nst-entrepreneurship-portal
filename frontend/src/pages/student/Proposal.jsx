import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Typography,
} from '@mui/material'
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from 'react-router'

import ProposalStepper from '../../components/ProposalStepper.jsx'

import Step1 from '../../components/Proposal_steps/Step1'
import Step2 from '../../components/Proposal_steps/Step2'
import Step3 from '../../components/Proposal_steps/Step3'
import Step4 from '../../components/Proposal_steps/Step4'
import Step5 from '../../components/Proposal_steps/Step5'

const steps = [
  {
    component: Step1,
  },
  {
    component: Step2,
  },
  {
    component: Step3,
  },
  {
    component: Step4,
  },
  {
    component: Step5,
  },
]

const initialEmptyData = {
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

const getPrefilledData = (proposal) => {
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
    weeklyHours:
      proposal.weeklyHours !== undefined ? proposal.weeklyHours : '',
    website: proposal.website || '',
  }
}

export const Proposal = () => {
  const submit = useSubmit()
  const navigation = useNavigation()
  const loaderData = useLoaderData()
  const actionData = useActionData()

  const isLoading = navigation.state === 'loading'
  const isSubmitting = navigation.state === 'submitting'

  const activeProposal =
    actionData?.proposal !== undefined
      ? actionData.proposal
      : loaderData?.proposal

  const errorMessage = actionData?.error || loaderData?.error

  const handleSubmit = (data) => {
    if (isSubmitting) {
      return
    }

    const payload = {
      ...data,

      assumptions: [
        data.assumption1,
        data.assumption2,
        data.assumption3,
      ].filter(Boolean),

      risks: [
        data.risk1,
        data.risk2,
        data.risk3,
      ].filter(Boolean),

      weeklyHours: Number(data.weeklyHours),
    }

    submit(payload, {
      method: 'post',
      encType: 'application/json',
    })
  }

  // Loading state while route loader or navigation is active
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading proposal status...
        </Typography>
      </Box>
    )
  }

  const latestReview =
    activeProposal?.reviews && activeProposal.reviews.length > 0
      ? activeProposal.reviews[activeProposal.reviews.length - 1]
      : null

  return (
    <>
      <div
        style={{
          padding: '10px',
          border: '1px solid #ccc',
          margin: '0 auto',
          borderRadius: '20px',
          maxWidth: '65%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography variant="h4">Proposal</Typography>

        <Typography variant="h6">
          Tell us where your startup is today
        </Typography>
      </div>

      {errorMessage && (
        <Alert
          severity="error"
          sx={{
            maxWidth: 900,
            mx: 'auto',
            mt: 3,
          }}
        >
          {errorMessage}
        </Alert>
      )}

      {/* STATE 1: PENDING (Under Review) */}
      {activeProposal && activeProposal.status === 'PENDING' ? (
        <Paper
          elevation={2}
          sx={{
            maxWidth: 750,
            mx: 'auto',
            mt: 4,
            p: 4,
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <Chip
            label="UNDER REVIEW"
            color="warning"
            sx={{ mb: 2, fontWeight: 700, letterSpacing: 0.5 }}
          />

          <Typography variant="h5" fontWeight={600} gutterBottom>
            {activeProposal.startupName}
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Your proposal has been submitted and is currently under review by
            the Mentor
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              textAlign: 'left',
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                STAGE
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {activeProposal.stage}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                INDUSTRY
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {activeProposal.industry?.name ||
                  activeProposal.industryName ||
                  '-'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                WEEKLY COMMITMENT
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {activeProposal.weeklyHours} hours/week
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                SUBMISSION DATE
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {activeProposal.createdAt
                  ? new Date(activeProposal.createdAt).toLocaleDateString(
                      undefined,
                      {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }
                    )
                  : 'Recently'}
              </Typography>
            </Box>
          </Box>
        </Paper>
      ) : activeProposal && activeProposal.status === 'APPROVED' ? (
        /* STATE 2: APPROVED (Venture Dashboard preview) */
        <Paper
          elevation={2}
          sx={{
            maxWidth: 750,
            mx: 'auto',
            mt: 4,
            p: 4,
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <Chip
            label="APPROVED"
            color="success"
            sx={{ mb: 2, fontWeight: 700, letterSpacing: 0.5 }}
          />

          <Typography variant="h5" fontWeight={600} gutterBottom>
            {activeProposal.venture?.name || activeProposal.startupName}
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Congratulations! Your venture proposal has been approved by the
            board.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              textAlign: 'left',
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                STAGE
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {activeProposal.venture?.stage || activeProposal.stage}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                INDUSTRY
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {activeProposal.industry?.name ||
                  activeProposal.industryName ||
                  '-'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                WEBSITE
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {activeProposal.venture?.website ||
                  activeProposal.website ||
                  'None provided'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                STATUS
              </Typography>
              <Typography variant="body1" fontWeight={500} color="success.main">
                Active Venture
              </Typography>
            </Box>
          </Box>
        </Paper>
      ) : (
        /* STATE 3 & 4: REJECTED (with remarks and prefilled form) OR NO PROPOSAL */
        <Box sx={{ mt: 3 }}>
          {activeProposal && activeProposal.status === 'REJECTED' && (
            <Alert
              severity="warning"
              sx={{
                maxWidth: 900,
                mx: 'auto',
                mb: 3,
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Proposal Requires Revision
              </Typography>

              {latestReview?.remarks ? (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  <strong>Reviewer Remarks:</strong> {latestReview.remarks}
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Your proposal was reviewed and requires updates. Please modify
                  the form below and resubmit.
                </Typography>
              )}
            </Alert>
          )}

          <ProposalStepper
            key={activeProposal?._id || 'new-proposal'}
            steps={steps}
            initialData={getPrefilledData(activeProposal)}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </Box>
      )}
    </>
  )
}
