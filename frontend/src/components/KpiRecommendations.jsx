import { useEffect, useState } from 'react'

import { Alert, Box, Button, Typography } from '@mui/material'

import {
  acceptRecommendation,
  dismissRecommendation,
  listRecommendations,
} from '../api/kpiRecommendations'
import SectionCard from './SectionCard'
import { SparklesIcon } from './icons'

const formatDay = date =>
  new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

// "2026-10-19" as a day, without a time zone moving it.
const formatMeetingDay = ymd =>
  ymd ? formatDay(`${ymd}T12:00:00`) : 'a meeting'

// A startup's recommendations (or a student's own), only `founderId`'s when
// given. Returns { recommendations } or { error }.
const fetchRecommendations = async (ventureId, founderId) => {
  const result = await listRecommendations(ventureId)
  if (result.error || !founderId) {
    return result
  }
  return {
    recommendations: result.recommendations.filter(
      r => String(r.founder?._id ?? r.founder) === String(founderId)
    ),
  }
}

const isPastDue = rec =>
  Boolean(rec.dueDate) && new Date(rec.dueDate) < new Date()

function Recommendation({ rec, showFounder, busy, onAccept, onDismiss }) {
  const pastDue = isPastDue(rec)
  const details = [
    showFounder && rec.founder?.username,
    rec.targetValue && `Target: ${rec.targetValue}`,
    rec.dueDate && `Due ${formatDay(rec.dueDate)}`,
    `From ${formatMeetingDay(rec.meetingDate)}`,
  ].filter(Boolean)
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderRadius: '14px',
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ flexGrow: 1, minWidth: 0, flexBasis: 260 }}>
        <Typography variant="subtitle1" component="p">
          {rec.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {details.join(' · ')}
        </Typography>
        {rec.quote && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, fontStyle: 'italic', overflowWrap: 'anywhere' }}
          >
            “{rec.quote}”
          </Typography>
        )}
        {pastDue && (
          <Typography variant="caption" color="warning.main">
            Its due date has passed. Add it as a new KPI if it still matters.
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="text"
          disabled={Boolean(busy)}
          loading={busy === 'dismiss'}
          onClick={() => onDismiss(rec)}
        >
          Dismiss
        </Button>
        <Button
          variant="contained"
          disabled={pastDue || Boolean(busy)}
          loading={busy === 'accept'}
          onClick={() => onAccept(rec)}
        >
          Accept
        </Button>
      </Box>
    </Box>
  )
}

// The KPIs the bot recommends from meeting transcripts, still to be
// accepted (they become the founder's draft KPIs) or dismissed. A student
// sees their own; staff pass `ventureId` for a startup's, and `founderId`
// on a founder's profile for just theirs. Shows nothing when there are
// none. `onAccepted` lets the page reload its KPIs.
export default function KpiRecommendations({
  ventureId,
  founderId,
  onAccepted,
  sx,
}) {
  const [recommendations, setRecommendations] = useState([])
  const [busy, setBusy] = useState({})
  const [error, setError] = useState('')

  // Bumped to load the list again.
  const [reloads, setReloads] = useState(0)

  useEffect(() => {
    let current = true
    fetchRecommendations(ventureId, founderId).then(result => {
      if (!current) {
        return
      }
      if (result.error) {
        setError(result.error)
        return
      }
      setRecommendations(result.recommendations)
    })
    return () => {
      current = false
    }
  }, [ventureId, founderId, reloads])

  const decide = async (rec, action) => {
    setBusy(current => ({ ...current, [rec._id]: action }))
    setError('')
    const result =
      action === 'accept'
        ? await acceptRecommendation(rec._id)
        : await dismissRecommendation(rec._id)
    setBusy(current => ({ ...current, [rec._id]: null }))
    if (result.error) {
      setError(result.error)
      // Someone else may have decided it already.
      setReloads(n => n + 1)
      return
    }
    setRecommendations(current => current.filter(r => r._id !== rec._id))
    if (action === 'accept') {
      onAccepted?.(result.kpi)
    }
  }

  if (!recommendations.length && !error) {
    return null
  }

  return (
    <SectionCard
      icon={SparklesIcon}
      tint="blue"
      title="Recommended KPIs"
      sx={sx}
      subtitle={
        ventureId
          ? 'Suggested by the KPI bot from meeting transcripts. Accept one to add it as the founder’s draft KPI.'
          : 'Suggested by the KPI bot from your meetings. Accept one to add it to your KPIs as a draft you can edit.'
      }
    >
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {recommendations.map(rec => (
          <Recommendation
            key={rec._id}
            rec={rec}
            showFounder={Boolean(ventureId)}
            busy={busy[rec._id]}
            onAccept={r => decide(r, 'accept')}
            onDismiss={r => decide(r, 'dismiss')}
          />
        ))}
      </Box>
    </SectionCard>
  )
}
