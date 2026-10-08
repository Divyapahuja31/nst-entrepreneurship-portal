import { Link as RouterLink, useLoaderData } from 'react-router'

import {
  Avatar,
  Box,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material'

import ActionCard from '../../components/ActionCard.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import SectionCard from '../../components/SectionCard.jsx'
import {
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  KpiIcon,
  PeopleIcon,
} from '../../components/icons.jsx'

import { useAuthStore } from '../../stores/auth'
import { tints } from '../../theme'

const firstName = user => user.username?.split(' ')[0] || 'there'

// The next check-in, in a line for its card.
const nextCheckInText = checkIns => {
  if (!checkIns) {
    return 'Your meetings with your mentor, with their Meet links.'
  }
  const next = checkIns.find(
    c =>
      c.status === 'SCHEDULED' &&
      new Date(c.scheduledAt).getTime() + c.durationMinutes * 60000 >
        Date.now()
  )
  if (!next) {
    return 'Your mentor hasn’t scheduled the next one yet.'
  }
  return `Next: ${new Date(next.scheduledAt).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

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
  const checkIns = useLoaderData()?.checkIns

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
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
        <Grid size={{ xs: 12, md: 4 }}>
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
        <Grid size={{ xs: 12, md: 4 }}>
          <ActionCard
            component={RouterLink}
            to="/biweekly"
            icon={CalendarIcon}
            tint="green"
            title="Bi-weekly report"
            description="Report what changed in the last two weeks."
            cta="Open report"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ActionCard
            component={RouterLink}
            to="/checkins"
            icon={ChatIcon}
            tint="blue"
            title="Mentor check-ins"
            description={nextCheckInText(checkIns)}
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

  if (isLoading || !loggedInUserData) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  // Students without a startup never get here: RequireOnboarded sends them
  // to /onboarding. Anyone else without one just gets a greeting.
  if (!loggedInUserData.venture) {
    return (
      <PageHeader
        title={`Welcome, ${firstName(loggedInUserData)}`}
        subtitle="Use the menu to find your way around."
      />
    )
  }

  return (
    <VentureDashboard
      user={loggedInUserData}
      venture={loggedInUserData.venture}
    />
  )
}
