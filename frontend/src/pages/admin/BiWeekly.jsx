import * as React from 'react'
import { useLoaderData } from 'react-router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Link from '@mui/material/Link'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import LockIcon from '@mui/icons-material/Lock'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

const CYCLES = 13 // 26 weeks = 13 bi-weekly cycles
const GRACE_DAYS = 3

/* ---------- Evidence checklist per cycle (stage-aware) ---------- */
const CHECKLISTS = {
  1: {
    stage: 'Discovery — Kickoff',
    items: [
      {
        key: 'problem_doc',
        label: 'Problem statement (1-pager)',
        hint: 'Who hurts, how much, why now.',
      },
      {
        key: 'interviews_3',
        label: '3 customer discovery interviews (recording or transcript)',
      },
      { key: 'assumptions_map', label: 'Riskiest assumptions map' },
      { key: 'goals_2w', label: '2-week goals doc' },
    ],
  },
  2: {
    stage: 'Discovery — Expand',
    items: [
      { key: 'interviews_5', label: '5 more customer interviews' },
      { key: 'jtbd', label: 'Jobs-to-be-Done statements (3 personas)' },
      { key: 'competitor_map', label: 'Competitor / alternatives map' },
      { key: 'insight_note', label: 'Discovery insight note (what changed)' },
    ],
  },
  3: {
    stage: 'Validation — Signal',
    items: [
      { key: 'landing_page', label: 'Landing page live URL' },
      { key: 'waitlist_signups', label: 'Waitlist signups screenshot (≥25)' },
      { key: 'survey_results', label: 'Survey results (n ≥ 20)' },
      { key: 'pricing_hyp', label: 'Pricing hypothesis doc' },
    ],
  },
  4: {
    stage: 'Validation — Commit',
    items: [
      { key: 'loi_or_prepay', label: 'Letter of intent or pre-payment (≥1)' },
      { key: 'wizard_test', label: 'Wizard-of-Oz / concierge test log' },
      { key: 'value_prop_v2', label: 'Value prop v2 (revised)' },
      { key: 'assumption_kill', label: 'Assumptions killed / kept summary' },
    ],
  },
  5: {
    stage: 'MVP — Build v1',
    items: [
      { key: 'mvp_demo', label: 'MVP demo video (≤3 min)' },
      { key: 'tech_doc', label: 'Architecture / build doc' },
      { key: 'user_test_3', label: '3 user testing recordings' },
      { key: 'bug_log', label: 'Bug / iteration log' },
    ],
  },
  6: {
    stage: 'MVP — Iterate',
    items: [
      { key: 'mvp_v2_demo', label: 'MVP v2 demo (post-iteration)' },
      { key: 'usability_report', label: 'Usability findings report' },
      {
        key: 'activation_metric',
        label: 'Activation metric definition + first read',
      },
      { key: 'roadmap_next', label: 'Roadmap for next cycle' },
    ],
  },
  7: {
    stage: 'Pilot — Launch',
    items: [
      { key: 'pilot_users', label: 'Pilot user list (≥5 with contact)' },
      { key: 'onboarding_flow', label: 'Onboarding flow doc' },
      { key: 'feedback_log', label: 'Structured pilot feedback log' },
      { key: 'nps_or_csat', label: 'NPS / CSAT first read' },
    ],
  },
  8: {
    stage: 'Pilot — Retain',
    items: [
      { key: 'retention_chart', label: 'W1/W2 retention chart' },
      { key: 'case_study', label: '1 written case study' },
      { key: 'pricing_test', label: 'Pricing test results' },
      { key: 'churn_reasons', label: 'Churn interviews (≥3)' },
    ],
  },
  9: {
    stage: 'Traction — Revenue',
    items: [
      { key: 'revenue_proof', label: 'Revenue proof (invoices / stripe)' },
      { key: 'cac_ltv', label: 'CAC / LTV first estimate' },
      { key: 'growth_chart', label: 'Weekly growth chart (last 8 weeks)' },
      { key: 'channel_test', label: 'Channel test summary' },
    ],
  },
  10: {
    stage: 'Traction — Scale readiness',
    items: [
      { key: 'unit_econ', label: 'Unit economics model' },
      { key: 'hiring_plan', label: 'Hiring / capacity plan' },
      { key: 'ops_playbook', label: 'Ops playbook v1' },
      { key: 'risk_register', label: 'Risk register' },
    ],
  },
  11: {
    stage: 'Final — Story',
    items: [
      { key: 'pitch_deck', label: 'Investor / defense deck v1' },
      { key: 'financial_model', label: '12-month financial model' },
      { key: 'team_bios', label: 'Team & advisors doc' },
      { key: 'traction_1pager', label: 'Traction 1-pager' },
    ],
  },
  12: {
    stage: 'Final — Rehearsal',
    items: [
      { key: 'pitch_v2', label: 'Deck v2 (post-mentor review)' },
      { key: 'dry_run_video', label: 'Dry-run pitch video' },
      { key: 'qa_prep', label: 'Q&A prep doc (20 questions)' },
      { key: 'next_6mo_plan', label: 'Next 6-month plan' },
    ],
  },
  13: {
    stage: 'Final — Defense',
    items: [
      { key: 'final_deck', label: 'Final defense deck (locked)' },
      { key: 'demo_final', label: 'Final demo recording' },
      {
        key: 'outcomes_doc',
        label: 'Outcomes summary (what shipped, what next)',
      },
      { key: 'career_reco_form', label: 'Career recommendation intake filled' },
    ],
  },
}

const STATUS_COLOR = { green: 'success', yellow: 'warning', red: 'error' }

function computeCycles(startISO) {
  const start = new Date(startISO)
  return Array.from({ length: CYCLES }, (_, i) => {
    const s = new Date(start)
    s.setDate(start.getDate() + i * 14)
    const e = new Date(s)
    e.setDate(s.getDate() + 13)
    const deadline = new Date(e)
    deadline.setDate(deadline.getDate() + GRACE_DAYS)
    return { n: i + 1, start: s, end: e, deadline }
  })
}

function shortDate(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function BiWeekly() {
  const data = useLoaderData()
  const [rows, setRows] = React.useState(data.submissions)
  const [observations, setObservations] = React.useState(data.observations)
  const [selected, setSelected] = React.useState(null)
  const [message, setMessage] = React.useState('')

  const { founder, evaluations, userId } = data
  const isStaff = data.role === 'admin'

  const cycles = React.useMemo(() => {
    const anchor =
      founder.intake_completed_at ??
      founder.created_at ??
      new Date().toISOString()
    return computeCycles(anchor)
  }, [founder])

  const currentCycle = React.useMemo(() => {
    const now = new Date()
    const c = cycles.find(c => now >= c.start && now <= c.end)
    return c?.n ?? cycles.find(c => now < c.start)?.n ?? CYCLES
  }, [cycles])

  const active = selected ?? currentCycle
  const activeMeta = cycles.find(c => c.n === active)
  const activeRow = rows.find(r => r.cycle_number === active)
  const submittedCount = rows.filter(r => r.submitted_at).length
  const missedCount = cycles.filter(
    c =>
      c.deadline < new Date() &&
      !rows.find(r => r.cycle_number === c.n && r.submitted_at)
  ).length

  const saveSubmission = (payload, submit) => {
    setRows(prev => {
      const existing = prev.find(r => r.cycle_number === payload.cycle_number)
      const next = {
        ...(existing ?? { id: `s${payload.cycle_number}` }),
        ...payload,
        submitted_at: submit
          ? new Date().toISOString()
          : (existing?.submitted_at ?? null),
      }
      return existing
        ? prev.map(r => (r.cycle_number === payload.cycle_number ? next : r))
        : [...prev, next]
    })
    setMessage(submit ? 'Submitted to faculty' : 'Draft saved')
  }

  const reopenSubmission = cycleNumber => {
    if (!window.confirm('Unlock to edit? Faculty will see this as re-opened.'))
      return
    setRows(prev =>
      prev.map(r =>
        r.cycle_number === cycleNumber ? { ...r, submitted_at: null } : r
      )
    )
    setMessage('Unlocked')
  }

  const saveObservation = payload => {
    setObservations(prev => {
      const existing = prev.find(
        o =>
          o.cycle_number === payload.cycle_number &&
          o.author_id === payload.author_id
      )
      const next = {
        ...(existing ?? { id: `o${prev.length + 1}` }),
        ...payload,
        updated_at: new Date().toISOString(),
      }
      return existing
        ? prev.map(o => (o.id === existing.id ? next : o))
        : [...prev, next]
    })
    setMessage('Observation saved')
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', display: 'block' }}
        >
          Bi-weekly portal
        </Typography>
        <Stack
          direction="row"
          spacing={2}
          alignItems="baseline"
          justifyContent="space-between"
          flexWrap="wrap"
        >
          <Typography variant="h4">{founder.startup_name}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Current cycle #{currentCycle}
          </Typography>
        </Stack>
      </Box>

      <MyProgress
        founder={founder}
        submittedCount={submittedCount}
        missedCount={missedCount}
        totalCycles={CYCLES}
        currentCycle={currentCycle}
        evaluations={evaluations}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(4, 1fr)',
            md: 'repeat(7, 1fr)',
            lg: 'repeat(13, 1fr)',
          },
          gap: 1,
        }}
      >
        {cycles.map(c => {
          const row = rows.find(r => r.cycle_number === c.n)
          const submitted = !!row?.submitted_at
          const draft = !!row && !submitted
          const now = new Date()
          const upcoming = now < c.start
          const missed = c.deadline < now && !submitted
          const isActive = c.n === active
          const color = submitted
            ? 'success'
            : missed
              ? 'error'
              : draft
                ? 'warning'
                : 'inherit'
          return (
            <Button
              key={c.n}
              onClick={() => setSelected(c.n)}
              variant={isActive ? 'contained' : 'outlined'}
              color={color}
              size="small"
              sx={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                textTransform: 'none',
                p: 1,
                opacity: upcoming && !isActive ? 0.6 : 1,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Cycle {c.n}
                {c.n === currentCycle ? ' •' : ''}
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                {shortDate(c.start)} – {shortDate(c.end)}
              </Typography>
              <Typography variant="caption">
                {submitted
                  ? 'Submitted'
                  : missed
                    ? 'Missed'
                    : draft
                      ? 'Draft'
                      : upcoming
                        ? 'Upcoming'
                        : 'Open'}
              </Typography>
            </Button>
          )
        })}
      </Box>

      <CycleForm
        key={activeMeta.n}
        cycleNumber={activeMeta.n}
        periodStart={activeMeta.start.toISOString().slice(0, 10)}
        periodEnd={activeMeta.end.toISOString().slice(0, 10)}
        deadline={activeMeta.deadline}
        existing={activeRow}
        isStaff={isStaff}
        onSave={saveSubmission}
        onReopen={reopenSubmission}
      />

      <MentorObservationSection
        key={`obs-${activeMeta.n}`}
        cycleNumber={activeMeta.n}
        submission={activeRow}
        observations={observations.filter(o => o.cycle_number === activeMeta.n)}
        canAuthor={isStaff}
        userId={userId}
        onSave={saveObservation}
      />

      <Snackbar
        open={!!message}
        autoHideDuration={2500}
        onClose={() => setMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setMessage('')}>
          {message}
        </Alert>
      </Snackbar>
    </Stack>
  )
}

/* =========== My Progress panel =========== */
function MyProgress({
  founder,
  submittedCount,
  missedCount,
  totalCycles,
  currentCycle,
  evaluations,
}) {
  const pct = Math.round((submittedCount / totalCycles) * 100)
  const latest = evaluations[0]

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          My progress
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
            mt: 1,
          }}
        >
          <Stat
            label="Stage"
            value={
              <Box component="span" sx={{ textTransform: 'capitalize' }}>
                {founder.lifecycle_stage ?? '—'}
              </Box>
            }
            sub={
              <Box component="span" sx={{ textTransform: 'capitalize' }}>
                {founder.lifecycle_status}
              </Box>
            }
          />
          <Stat
            label="Cycles submitted"
            value={
              <Typography variant="h5" component="span">
                {submittedCount}
                <Typography component="span" sx={{ color: 'text.secondary' }}>
                  /{totalCycles}
                </Typography>
              </Typography>
            }
            sub={
              <Stack direction="row" spacing={1} alignItems="center">
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  color="success"
                  sx={{ flexGrow: 1 }}
                />
                <span>{pct}%</span>
              </Stack>
            }
          />
          <Stat
            label="Current status"
            value={
              latest?.status ? (
                <Chip
                  size="small"
                  variant="outlined"
                  color={STATUS_COLOR[latest.status]}
                  label={latest.status}
                  sx={{ textTransform: 'capitalize' }}
                />
              ) : (
                'No review yet'
              )
            }
            sub={
              missedCount > 0 ? (
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ color: 'error.main' }}
                >
                  <WarningAmberIcon fontSize="inherit" />
                  <span>
                    {missedCount} missed cycle{missedCount > 1 ? 's' : ''}
                  </span>
                </Stack>
              ) : (
                `On track · cycle #${currentCycle}`
              )
            }
          />
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              Recent scores
            </Typography>
            {evaluations.length === 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                No evaluations yet.
              </Typography>
            )}
            {evaluations.slice(0, 4).map(e => (
              <Stack
                key={e.id}
                direction="row"
                justifyContent="space-between"
                sx={{ fontSize: 13 }}
              >
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  M{e.month_number} · {shortDate(new Date(e.created_at))}
                </Box>
                <Box component="span" sx={{ fontFamily: 'monospace' }}>
                  {e.total_score}/100
                </Box>
              </Stack>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, sub }) {
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', display: 'block' }}
      >
        {label}
      </Typography>
      <Box sx={{ fontSize: 14 }}>{value}</Box>
      {sub && (
        <Box sx={{ fontSize: 12, mt: 0.5, color: 'text.secondary' }}>{sub}</Box>
      )}
    </Box>
  )
}

/* =========== Cycle Form (checklist + lock) =========== */
const BASELINE = {
  progress_summary: '',
  wins: '',
  blockers: '',
  hours_worked: 0,
  customer_interviews: 0,
  features_shipped: 0,
  revenue: 0,
  users_acquired: 0,
  experiments_run: 0,
  mentor_meeting_date: '',
  mentor_meeting_notes: '',
  goals_next_cycle: '',
  ask_for_help: '',
}

function CycleForm({
  cycleNumber,
  periodStart,
  periodEnd,
  deadline,
  existing,
  isStaff,
  onSave,
  onReopen,
}) {
  const [f, setF] = React.useState(() =>
    existing
      ? Object.fromEntries(
          Object.keys(BASELINE).map(k => [k, existing[k] ?? BASELINE[k]])
        )
      : BASELINE
  )
  const [links, setLinks] = React.useState(() =>
    Array.isArray(existing?.evidence_links) ? existing.evidence_links : []
  )
  const [checked, setChecked] = React.useState(() => {
    const map = {}
    const evLinks = Array.isArray(existing?.evidence_links)
      ? existing.evidence_links
      : []
    evLinks.forEach(l => {
      if (l.check) map[l.check] = true
    })
    return map
  })

  const now = new Date()
  const submitted = !!existing?.submitted_at
  const pastDeadline = deadline < now
  // Locked for students once submitted or past deadline. Staff can always edit.
  const locked = !isStaff && (submitted || pastDeadline)
  const checklist = CHECKLISTS[cycleNumber]

  const requiredCount = checklist?.items.length ?? 0
  const doneCount =
    checklist?.items.filter(
      i => checked[i.key] || links.some(l => l.check === i.key && l.url)
    ).length ?? 0
  const daysToDeadline = Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  const save = submit => {
    const linksWithChecks = links.map(l => ({
      title: l.title,
      url: l.url,
      ...(l.check ? { check: l.check } : {}),
    }))
    const trackedCheckKeys = new Set(
      linksWithChecks.filter(l => l.check).map(l => l.check)
    )
    const extra = Object.entries(checked)
      .filter(([k, v]) => v && !trackedCheckKeys.has(k))
      .map(([k]) => ({
        title: checklist?.items.find(i => i.key === k)?.label ?? k,
        url: '',
        check: k,
        self_confirmed: true,
      }))

    onSave(
      {
        ...f,
        cycle_number: cycleNumber,
        period_start: periodStart,
        period_end: periodEnd,
        evidence_links: [...linksWithChecks, ...extra],
        mentor_meeting_date: f.mentor_meeting_date || null,
      },
      submit
    )
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          flexWrap="wrap"
          gap={1}
        >
          <Box>
            <Typography variant="h6">
              Cycle {cycleNumber}
              {checklist && (
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ color: 'text.secondary' }}
                >
                  {' '}
                  · {checklist.stage}
                </Typography>
              )}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {new Date(periodStart).toLocaleDateString()} –{' '}
              {new Date(periodEnd).toLocaleDateString()} · Deadline:{' '}
              {deadline.toLocaleDateString()}
              {!pastDeadline &&
                !submitted &&
                ` (${daysToDeadline} day${daysToDeadline === 1 ? '' : 's'} left)`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {submitted && (
              <Chip
                size="small"
                color="success"
                variant="outlined"
                icon={<CheckCircleIcon />}
                label="Submitted"
              />
            )}
            {!submitted && pastDeadline && (
              <Chip
                size="small"
                color="error"
                variant="outlined"
                icon={<LockIcon />}
                label="Missed & locked"
              />
            )}
            {isStaff && (submitted || pastDeadline) && existing && (
              <Button size="small" onClick={() => onReopen(cycleNumber)}>
                Reopen (staff)
              </Button>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={2}>
          {checklist && (
            <Box
              sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                  Required this cycle
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {doneCount}/{requiredCount}
                </Typography>
              </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 1,
                }}
              >
                {checklist.items.map(item => {
                  const hasLink = links.some(l => l.check === item.key && l.url)
                  const done = hasLink || !!checked[item.key]
                  return (
                    <Stack
                      key={item.key}
                      direction="row"
                      spacing={1}
                      alignItems="flex-start"
                      sx={{
                        border: 1,
                        borderColor: done ? 'success.light' : 'divider',
                        borderRadius: 1,
                        p: 1,
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={done}
                        disabled={locked || hasLink}
                        onChange={e =>
                          setChecked({
                            ...checked,
                            [item.key]: e.target.checked,
                          })
                        }
                        sx={{ p: 0.5 }}
                      />
                      <Box>
                        <Typography variant="body2">{item.label}</Typography>
                        {item.hint && (
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', display: 'block' }}
                          >
                            {item.hint}
                          </Typography>
                        )}
                        {!locked && (
                          <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() =>
                              setLinks([
                                ...links,
                                { title: item.label, url: '', check: item.key },
                              ])
                            }
                            sx={{ textTransform: 'none', px: 0 }}
                          >
                            Attach link
                          </Button>
                        )}
                      </Box>
                    </Stack>
                  )
                })}
              </Box>
            </Box>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            <Num
              label="Hours worked"
              value={f.hours_worked}
              onChange={v => setF({ ...f, hours_worked: v })}
              disabled={locked}
            />
            <Num
              label="Customer interviews"
              value={f.customer_interviews}
              onChange={v => setF({ ...f, customer_interviews: v })}
              disabled={locked}
            />
            <Num
              label="Features shipped"
              value={f.features_shipped}
              onChange={v => setF({ ...f, features_shipped: v })}
              disabled={locked}
            />
            <Num
              label="Revenue (₹)"
              value={f.revenue}
              onChange={v => setF({ ...f, revenue: v })}
              disabled={locked}
            />
            <Num
              label="Users acquired"
              value={f.users_acquired}
              onChange={v => setF({ ...f, users_acquired: v })}
              disabled={locked}
            />
            <Num
              label="Experiments run"
              value={f.experiments_run}
              onChange={v => setF({ ...f, experiments_run: v })}
              disabled={locked}
            />
          </Box>

          <Area
            label="Progress summary — what did you do these two weeks?"
            value={f.progress_summary}
            onChange={v => setF({ ...f, progress_summary: v })}
            disabled={locked}
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            <Area
              label="Wins"
              value={f.wins}
              onChange={v => setF({ ...f, wins: v })}
              disabled={locked}
            />
            <Area
              label="Blockers / what failed"
              value={f.blockers}
              onChange={v => setF({ ...f, blockers: v })}
              disabled={locked}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            <TextField
              label="Mentor meeting date"
              type="date"
              size="small"
              value={f.mentor_meeting_date ?? ''}
              disabled={locked}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={e =>
                setF({ ...f, mentor_meeting_date: e.target.value })
              }
            />
            <Area
              label="Mentor meeting notes"
              value={f.mentor_meeting_notes}
              onChange={v => setF({ ...f, mentor_meeting_notes: v })}
              disabled={locked}
            />
          </Box>

          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                Evidence links
              </Typography>
              {!locked && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setLinks([...links, { title: '', url: '' }])}
                >
                  Add link
                </Button>
              )}
            </Stack>
            {links.length === 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                No evidence links yet. Add call recordings, demo videos,
                screenshots, or docs.
              </Typography>
            )}
            <Stack spacing={1}>
              {links.map((l, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  {l.check && (
                    <Chip size="small" label="req" variant="outlined" />
                  )}
                  <TextField
                    size="small"
                    placeholder="Title"
                    value={l.title}
                    disabled={locked}
                    fullWidth
                    onChange={e =>
                      setLinks(
                        links.map((x, j) =>
                          j === i ? { ...x, title: e.target.value } : x
                        )
                      )
                    }
                  />
                  <TextField
                    size="small"
                    placeholder="https://"
                    value={l.url}
                    disabled={locked}
                    fullWidth
                    onChange={e =>
                      setLinks(
                        links.map((x, j) =>
                          j === i ? { ...x, url: e.target.value } : x
                        )
                      )
                    }
                  />
                  {!locked && (
                    <IconButton
                      size="small"
                      onClick={() => setLinks(links.filter((_, j) => j !== i))}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              ))}
            </Stack>
          </Box>

          <Area
            label="Goals for next cycle"
            value={f.goals_next_cycle}
            onChange={v => setF({ ...f, goals_next_cycle: v })}
            disabled={locked}
          />
          <Area
            label="Where do you need help?"
            value={f.ask_for_help}
            onChange={v => setF({ ...f, ask_for_help: v })}
            disabled={locked}
          />

          {!locked && (
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={1}
            >
              <Typography variant="caption" sx={{ color: 'warning.main' }}>
                {requiredCount > 0 &&
                  doneCount < requiredCount &&
                  `${requiredCount - doneCount} required item${
                    requiredCount - doneCount > 1 ? 's' : ''
                  } still missing.`}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => save(false)}
                >
                  Save draft
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  disabled={!f.progress_summary}
                  onClick={() => save(true)}
                >
                  Submit cycle {cycleNumber}
                </Button>
              </Stack>
            </Stack>
          )}

          {locked && !submitted && (
            <Alert severity="error" icon={<LockIcon />}>
              Deadline passed on {deadline.toLocaleDateString()}. Contact
              faculty to reopen.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

/* =========== Mentor observations =========== */
function MentorObservationSection({
  cycleNumber,
  submission,
  observations,
  canAuthor,
  userId,
  onSave,
}) {
  const evidenceLinks = Array.isArray(submission?.evidence_links)
    ? submission.evidence_links
    : []
  const mine = observations.find(o => o.author_id === userId)

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          Mentor observation · Cycle {cycleNumber}
        </Typography>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {observations.length === 0 && !canAuthor && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No mentor observations for this cycle yet.
            </Typography>
          )}
          {observations.map(o => (
            <Box
              key={o.id}
              sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {new Date(o.updated_at ?? o.created_at).toLocaleString()}
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', my: 1 }}
              >
                {o.observation}
              </Typography>
              {o.strengths && (
                <Typography variant="body2">
                  <strong>Strengths:</strong> {o.strengths}
                </Typography>
              )}
              {o.concerns && (
                <Typography variant="body2">
                  <strong>Concerns:</strong> {o.concerns}
                </Typography>
              )}
              {o.action_items && (
                <Typography variant="body2">
                  <strong>Action items:</strong> {o.action_items}
                </Typography>
              )}
              {Array.isArray(o.evidence_reviewed) &&
                o.evidence_reviewed.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block' }}
                    >
                      Evidence reviewed:
                    </Typography>
                    {o.evidence_reviewed.map((idx, i) => {
                      const link = evidenceLinks[idx]
                      if (!link) return null
                      return (
                        <Stack
                          key={i}
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                        >
                          <OpenInNewIcon fontSize="inherit" />
                          {link.url ? (
                            <Link
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              variant="body2"
                            >
                              {link.title || link.url}
                            </Link>
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{ color: 'text.secondary' }}
                            >
                              {link.title}
                            </Typography>
                          )}
                        </Stack>
                      )
                    })}
                  </Box>
                )}
            </Box>
          ))}

          {canAuthor && (
            <ObservationForm
              cycleNumber={cycleNumber}
              userId={userId}
              existing={mine}
              evidenceLinks={evidenceLinks}
              onSave={onSave}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

function ObservationForm({
  cycleNumber,
  userId,
  existing,
  evidenceLinks,
  onSave,
}) {
  const [open, setOpen] = React.useState(!existing)
  const [f, setF] = React.useState({
    observation: existing?.observation ?? '',
    strengths: existing?.strengths ?? '',
    concerns: existing?.concerns ?? '',
    action_items: existing?.action_items ?? '',
  })
  const [reviewed, setReviewed] = React.useState(
    Array.isArray(existing?.evidence_reviewed) ? existing.evidence_reviewed : []
  )
  const [error, setError] = React.useState('')

  const save = () => {
    if (!f.observation.trim()) {
      setError('Observation notes are required.')
      return
    }
    setError('')
    onSave({
      cycle_number: cycleNumber,
      author_id: userId,
      ...f,
      evidence_reviewed: reviewed,
    })
    setOpen(false)
  }

  if (!open) {
    return (
      <Box>
        <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
          {existing ? 'Edit my observation' : 'Add observation'}
        </Button>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        border: 1,
        borderStyle: 'dashed',
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
      }}
    >
      <Stack spacing={2}>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          {existing ? 'Edit your observation' : 'New observation'}
        </Typography>
        <Area
          label="Observation (required)"
          value={f.observation}
          onChange={v => setF({ ...f, observation: v })}
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
          <Area
            label="Strengths"
            value={f.strengths}
            onChange={v => setF({ ...f, strengths: v })}
          />
          <Area
            label="Concerns"
            value={f.concerns}
            onChange={v => setF({ ...f, concerns: v })}
          />
        </Box>
        <Area
          label="Action items for founder"
          value={f.action_items}
          onChange={v => setF({ ...f, action_items: v })}
        />

        {evidenceLinks.length > 0 && (
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              Link to reviewed evidence
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 1,
              }}
            >
              {evidenceLinks.map((l, i) => {
                const isChecked = reviewed.includes(i)
                return (
                  <Stack
                    key={i}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      border: 1,
                      borderColor: isChecked ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      px: 1,
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={isChecked}
                      onChange={e =>
                        setReviewed(
                          e.target.checked
                            ? [...reviewed, i]
                            : reviewed.filter(x => x !== i)
                        )
                      }
                    />
                    <Typography variant="body2" noWrap>
                      {l.title || l.url || `Item ${i + 1}`}
                    </Typography>
                  </Stack>
                )
              })}
            </Box>
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={save}>
            Save observation
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

function Num({ label, value, onChange, disabled }) {
  return (
    <TextField
      label={label}
      type="number"
      size="small"
      value={value}
      disabled={disabled}
      onChange={e => onChange(Number(e.target.value))}
    />
  )
}

function Area({ label, value, onChange, disabled }) {
  return (
    <TextField
      label={label}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      multiline
      rows={3}
      fullWidth
      size="small"
    />
  )
}

export default BiWeekly
