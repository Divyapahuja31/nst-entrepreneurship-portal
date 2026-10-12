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
  return `Next: ${formatWhen(next.scheduledAt)}`
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

// Recent activity -----------------------------------------------------------

const KPI_EVENTS = {
  WAITING_FOR_APPROVAL: 'sent for approval',
  ACCEPTED: 'approved',
  REJECTED: 'sent back for changes',
  GRADED: 'graded',
}

const kpiActivity = kpi => {
  if (kpi.isLocked) {
    return {
      at: kpi.lockedAt ?? kpi.updatedAt,
      text: `KPI “${kpi.title}” locked at ${kpi.score} pts`,
    }
  }
  const event = KPI_EVENTS[kpi.status]
  if (!event) {
    return null
  }
  const score = kpi.status === 'GRADED' ? ` (${kpi.score} pts)` : ''
  return { at: kpi.updatedAt, text: `KPI “${kpi.title}” ${event}${score}` }
}

const CHECK_IN_EVENTS = {
  SCHEDULED: (c, what) => [
    c.createdAt,
    `${what} scheduled for ${formatWhen(c.scheduledAt)}`,
  ],
  HELD: (c, what) =>
    c.transcript?.status === 'READY'
      ? [c.transcript.fetchedAt ?? c.scheduledAt, `${what} transcript ready`]
      : [c.scheduledAt, `${what} held`],
  NOT_HELD: (c, what) => [c.scheduledAt, `${what} not held`],
  CANCELLED: (c, what) => [
    c.cancelledAt ?? c.updatedAt,
    `${what} on ${formatWhen(c.scheduledAt)} cancelled`,
  ],
}

const checkInActivity = checkIn => {
  const describe = CHECK_IN_EVENTS[checkIn.status]
  if (!describe) {
    return null
  }
  const [at, text] = describe(
    checkIn,
    checkIn.session ? 'Programme session' : 'Check-in'
  )
  return { at, text }
}

const formatWhen = date =>
  new Date(date).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })

const formatAgo = date => {
  const days = Math.floor((Date.now() - new Date(date)) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

// The latest KPI and check-in changes, newest first, nothing in the future.
const recentActivity = ({ kpis, checkIns }, limit = 6) =>
  [
    ...(kpis ?? []).map(kpiActivity),
    ...(checkIns ?? []).map(checkInActivity),
  ]
    .filter(item => item?.at && new Date(item.at) <= Date.now())
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit)

function RecentActivity({ items }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={ChartIcon}
        title="No activity yet"
        description="Updates to your KPIs and check-ins will show up here."
      />
    )
  }
  return (
    <List disablePadding>
      {items.map(item => (
        <ListItem key={`${item.at}-${item.text}`} disableGutters>
          <ListItemText
            primary={item.text}
            secondary={formatAgo(item.at)}
            slotProps={{ primary: { variant: 'body1' } }}
          />
        </ListItem>
      ))}
    </List>
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
  const loaded = useLoaderData()
  const checkIns = loaded?.checkIns
  const activity = recentActivity({ kpis: loaded?.kpis, checkIns })

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
            <RecentActivity items={activity} />
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
