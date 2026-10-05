import { useState } from 'react'
import { Navigate } from 'react-router'

import { Alert, Box, Button, Dialog, Grid, Typography } from '@mui/material'

import ActionCard from '../../components/ActionCard.jsx'
import CreateVentureStep from '../../components/CreateVentureStep.jsx'
import IconBadge from '../../components/IconBadge.jsx'
import JoinVentureStep from '../../components/JoinVentureStep.jsx'
import SectionCard from '../../components/SectionCard.jsx'
import useSignOut from '../../components/useSignOut.js'
import {
  ChartIcon,
  CheckCircleIcon,
  CircleIcon,
  HourglassIcon,
  LightbulbIcon,
  PersonAddIcon,
} from '../../components/icons.jsx'

import { needsOnboarding, useAuthStore } from '../../stores/auth'

const firstName = user => user.username?.split(' ')[0] || 'there'

// Onboarding has no sidebar, so this is the only way out of it.
export function OnboardingSignOut() {
  const { signingOut, signOutError, handleSignOut } = useSignOut()

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {signOutError && (
        <Typography variant="caption" color="error">
          {signOutError}
        </Typography>
      )}
      <Button
        size="small"
        color="inherit"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? 'Signing out...' : 'Sign Out'}
      </Button>
    </Box>
  )
}

function PageHeader({ title, subtitle }) {
  return (
    <Box sx={{ mb: { xs: 4, sm: 5 }, textAlign: 'center' }}>
      <Typography
        variant="h2"
        component="h1"
        sx={{ fontSize: { xs: '2rem', sm: '2.5rem' }, mb: 1 }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  )
}

// No startup yet ------------------------------------------------------------

const ventureOptions = [
  {
    step: 'create',
    icon: LightbulbIcon,
    tint: 'blue',
    title: 'Create a startup',
    description:
      'Have an idea? Describe it in a proposal and invite your co-founders.',
    cta: 'Write a proposal',
  },
  {
    step: 'join',
    icon: PersonAddIcon,
    tint: 'green',
    title: 'Join a startup',
    description:
      'Your team already applied? Ask to join their startup as a founder.',
    cta: 'Find your team',
  },
]

const howItWorks = [
  { icon: LightbulbIcon, title: 'Apply', text: 'Create or join a startup.' },
  {
    icon: HourglassIcon,
    title: 'Get approved',
    text: 'An admin reviews your request.',
  },
  {
    icon: ChartIcon,
    title: 'Track progress',
    text: 'Set KPIs and check in every two weeks.',
  },
]

function GetStarted({ user, rejectedApplication, onApplied }) {
  const [step, setStep] = useState(null)
  const close = () => setStep(null)

  return (
    <Box sx={{ width: '100%', maxWidth: 880 }}>
      <PageHeader
        title={`Welcome, ${firstName(user)}`}
        subtitle="To use the portal, create a startup or join your team's."
      />

      {rejectedApplication && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {rejectedApplication.type === 'PROPOSAL'
            ? `Your proposal for ${rejectedApplication.ventureName} wasn't approved. You can submit a new one.`
            : `Your request to join ${rejectedApplication.ventureName} wasn't approved. You can apply again.`}
        </Alert>
      )}

      <Grid container spacing={2}>
        {ventureOptions.map(option => (
          <Grid key={option.step} size={{ xs: 12, sm: 6 }}>
            <ActionCard
              icon={option.icon}
              tint={option.tint}
              title={option.title}
              description={option.description}
              cta={option.cta}
              onClick={() => setStep(option.step)}
            />
          </Grid>
        ))}
      </Grid>

      <Typography
        variant="subtitle2"
        component="h2"
        color="text.secondary"
        sx={{ mt: 6, mb: 2, textAlign: 'center' }}
      >
        How it works
      </Typography>

      <Grid
        container
        spacing={3}
        component="ol"
        sx={{ listStyle: 'none', p: 0, m: 0 }}
      >
        {howItWorks.map(item => (
          <Grid
            key={item.title}
            component="li"
            size={{ xs: 12, sm: 4 }}
            sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}
          >
            <IconBadge icon={item.icon} tint="gray" size={36} />
            <Box>
              <Typography variant="subtitle2">{item.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.text}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Dialog open={step === 'create'} onClose={close} maxWidth="md" fullWidth>
        <CreateVentureStep onBack={close} onSubmitted={onApplied} />
      </Dialog>

      <Dialog open={step === 'join'} onClose={close} maxWidth="sm" fullWidth>
        <JoinVentureStep onBack={close} onSubmitted={onApplied} />
      </Dialog>
    </Box>
  )
}

// Waiting for approval ------------------------------------------------------

function ProgressStep({ state, title, text, last }) {
  const icon = {
    done: <CheckCircleIcon sx={{ color: 'success.main' }} />,
    current: <HourglassIcon sx={{ color: 'warning.main' }} />,
    upcoming: <CircleIcon sx={{ color: 'text.disabled' }} />,
  }[state]

  return (
    <Box component="li" sx={{ display: 'flex', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {icon}
        {!last && (
          <Box
            sx={{ width: '1px', flexGrow: 1, my: 0.5, bgcolor: 'divider' }}
          />
        )}
      </Box>
      <Box sx={{ pb: last ? 0 : 3 }}>
        <Typography
          variant="subtitle2"
          color={state === 'upcoming' ? 'text.secondary' : 'text.primary'}
        >
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {text}
        </Typography>
      </Box>
    </Box>
  )
}

function PendingApplication({ user, application }) {
  const isProposal = application.type === 'PROPOSAL'

  return (
    <Box sx={{ width: '100%', maxWidth: 640 }}>
      <PageHeader
        title={`Welcome, ${firstName(user)}`}
        subtitle="Your application is being reviewed."
      />

      <SectionCard>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
          <IconBadge icon={HourglassIcon} tint="orange" />
          <Box>
            <Typography variant="h6" component="h2">
              {application.ventureName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isProposal ? 'New startup proposal' : 'Request to join'}
            </Typography>
          </Box>
        </Box>

        <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
          <ProgressStep
            state="done"
            title={isProposal ? 'Proposal submitted' : 'Request sent'}
            text="We've received your application."
          />
          <ProgressStep
            state="current"
            title="Admin review"
            text="An admin is looking at it now. There's nothing you need to do."
          />
          <ProgressStep
            state="upcoming"
            title="Startup dashboard"
            text="Once approved, the rest of the portal opens up."
            last
          />
        </Box>
      </SectionCard>
    </Box>
  )
}

export default function PageOnboarding() {
  const user = useAuthStore(state => state.user)
  const fetchUser = useAuthStore(state => state.fetchUser)

  // Founders, admins and mentors have nothing to onboard.
  if (!needsOnboarding(user)) {
    return <Navigate to="/" replace />
  }

  const application = user.application

  return (
    <Box
      component="main"
      sx={{
        // Fill the screen below the 48px header and centre the step in it.
        minHeight: 'calc(100vh - 48px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: { xs: 4, sm: 6 },
      }}
    >
      {application?.status === 'PENDING' ? (
        <PendingApplication user={user} application={application} />
      ) : (
        <GetStarted
          user={user}
          rejectedApplication={
            application?.status === 'REJECTED' ? application : null
          }
          onApplied={fetchUser}
        />
      )}
    </Box>
  )
}
