import { useState } from 'react'
import { Link as RouterLink } from 'react-router'

import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Dialog,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material'

import ActionCard from '../../components/ActionCard.jsx'
import CreateVentureStep from '../../components/CreateVentureStep.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import IconBadge from '../../components/IconBadge.jsx'
import JoinVentureStep from '../../components/JoinVentureStep.jsx'
import SectionCard from '../../components/SectionCard.jsx'
import {
  CalendarIcon,
  ChartIcon,
  CheckCircleIcon,
  CircleIcon,
  HourglassIcon,
  KpiIcon,
  LightbulbIcon,
  PeopleIcon,
  PersonAddIcon,
} from '../../components/icons.jsx'

import { useAuthStore } from '../../stores/auth'
import { tints } from '../../theme'

const firstName = user => user.username?.split(' ')[0] || 'there'

function PageHeader({ title, subtitle }) {
  return (
    <Box sx={{ mb: { xs: 4, sm: 5 } }}>
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
    <Box sx={{ maxWidth: 880 }}>
      <PageHeader
        title={`Welcome, ${firstName(user)}`}
        subtitle="You're not part of a startup yet. Pick how you'd like to start."
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
        sx={{ mt: 6, mb: 2 }}
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
    <Box sx={{ maxWidth: 640 }}>
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
            text="Once approved, your KPIs and check-ins appear here."
            last
          />
        </Box>
      </SectionCard>
    </Box>
  )
}

// Founder dashboard ---------------------------------------------------------

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('')
}

function VentureDashboard({ user, venture }) {
  const founders = venture.founders || []

  return (
    <Box sx={{ maxWidth: 1080 }}>
      <PageHeader
        title={`Welcome back, ${firstName(user)}`}
        subtitle={
          <>
            You're a founder at{' '}
            <Box
              component="strong"
              sx={{ color: 'text.primary', fontWeight: 600 }}
            >
              {venture.name}
            </Box>
            .
          </>
        }
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ActionCard
            component={RouterLink}
            to="/kpis"
            icon={KpiIcon}
            tint="blue"
            title="KPIs"
            description="Your startup's goals and the evidence behind them."
            cta="Open KPIs"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ActionCard
            component={RouterLink}
            to={`/profile/${user._id}`}
            icon={CalendarIcon}
            tint="green"
            title="Bi-weekly check-in"
            description="Report what changed in the last two weeks."
            cta="Open check-ins"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <SectionCard icon={PeopleIcon} title="Team">
            <List disablePadding>
              {founders.map(founder => {
                const name = founder.username || String(founder)
                const isYou = founder._id === user._id
                return (
                  <ListItem key={founder._id || name} disableGutters>
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: tints.blue.bg,
                          color: tints.blue.fg,
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                        }}
                      >
                        {initials(name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={isYou ? `${name} (you)` : name}
                      secondary={founder.email}
                      slotProps={{ primary: { variant: 'body1' } }}
                    />
                  </ListItem>
                )
              })}
            </List>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <SectionCard icon={ChartIcon} title="Recent activity">
            <EmptyState
              icon={ChartIcon}
              title="No activity yet"
              description="Updates to your KPIs and check-ins will show up here."
            />
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  )
}

export default function Dashboard() {
  const loggedInUserData = useAuthStore(state => state.user)
  const isLoading = useAuthStore(state => state.isLoading)
  const fetchUser = useAuthStore(state => state.fetchUser)

  if (isLoading || !loggedInUserData) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  const venture = loggedInUserData.venture
  const application = loggedInUserData.application

  if (venture) {
    return <VentureDashboard user={loggedInUserData} venture={venture} />
  }

  if (application?.status === 'PENDING') {
    return (
      <PendingApplication user={loggedInUserData} application={application} />
    )
  }

  return (
    <GetStarted
      user={loggedInUserData}
      rejectedApplication={
        application?.status === 'REJECTED' ? application : null
      }
      onApplied={fetchUser}
    />
  )
}
