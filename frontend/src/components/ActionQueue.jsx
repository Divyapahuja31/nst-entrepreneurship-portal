import { Fragment } from 'react'
import { Link } from 'react-router'

import { Box, Button, Divider, Typography } from '@mui/material'

import EmptyState from './EmptyState'
import SectionCard from './SectionCard'
import { CheckCircleIcon, HourglassIcon } from './icons'
import { tints } from '../theme'

const ITEMS = [
  {
    key: 'proposals',
    label: 'Startup proposals to review',
    to: '/admin/venture',
    age: 'waiting',
  },
  {
    key: 'joinRequests',
    label: 'Join requests to review',
    to: '/admin/venture',
    age: 'waiting',
  },
  {
    key: 'kpisToGrade',
    label: 'KPIs waiting to be graded',
    to: '/admin/kpis',
    age: 'waiting',
  },
  {
    key: 'missedDeadlines',
    label: 'KPIs past their due date, never submitted',
    to: '/admin/kpis',
    age: 'overdue',
  },
]

const DAY_MS = 24 * 60 * 60 * 1000

const describeAge = (date, kind) => {
  if (!date) {
    return null
  }
  const days = Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS)
  const span = days < 1 ? 'today' : `${days} day${days === 1 ? '' : 's'}`
  if (kind === 'overdue') {
    return days < 1 ? 'Oldest was due today' : `Oldest was due ${span} ago`
  }
  return days < 1 ? 'Oldest arrived today' : `Oldest has waited ${span}`
}

function Count({ value, tint }) {
  const { bg, fg } = tints[tint]
  return (
    <Box
      sx={{
        minWidth: 36,
        height: 28,
        px: 1,
        borderRadius: 1.5,
        display: 'grid',
        placeItems: 'center',
        bgcolor: bg,
        color: fg,
        fontWeight: 600,
        fontSize: '0.875rem',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </Box>
  )
}

// Work waiting on admins, with a link to where it gets done. Only items
// that need action are listed.
export default function ActionQueue({ actions }) {
  const pending = ITEMS.filter(item => actions?.[item.key]?.count > 0)

  return (
    <SectionCard
      icon={HourglassIcon}
      tint="orange"
      title="Needs Your Attention"
    >
      {pending.length === 0 ? (
        <EmptyState
          icon={CheckCircleIcon}
          title="You're all caught up"
          description="No applications to review, no KPIs to grade and no missed deadlines."
        />
      ) : (
        pending.map((item, index) => {
          const { count, oldestAt } = actions[item.key]
          return (
            <Fragment key={item.key}>
              {index > 0 && <Divider />}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 1.5,
                }}
              >
                <Count
                  value={count}
                  tint={item.age === 'overdue' ? 'red' : 'orange'}
                />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body1">{item.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {describeAge(oldestAt, item.age)}
                  </Typography>
                </Box>
                <Button variant="outlined" component={Link} to={item.to}>
                  Open
                </Button>
              </Box>
            </Fragment>
          )
        })
      )}
    </SectionCard>
  )
}
