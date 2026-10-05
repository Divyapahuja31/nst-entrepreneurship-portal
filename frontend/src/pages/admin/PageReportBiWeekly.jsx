import * as React from 'react'
import { Link as RouterLink, useLoaderData, useRevalidator } from 'react-router'

import {
  reopenBiWeeklySubmission,
  saveBiWeeklyEvaluation,
  saveBiWeeklyObservation,
  submitBiWeeklyCycle,
} from '../../api/biweekly'
import toError from '../../api/toError'

import { useAuthStore } from '../../stores/auth'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import {
  ArrowRightIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  CheckmarkIcon,
  ChevronRightIcon,
  DocIcon,
  DocTextIcon,
  KpiIcon,
  LinkIcon,
  LockIcon as LockClosedIcon,
  PlusIcon,
  SendIcon,
  TargetIcon,
  TrashIcon,
  WarningIcon,
} from '../../components/icons'
import EmptyState from '../../components/EmptyState'
import SectionCard from '../../components/SectionCard'
import StatTile from '../../components/StatTile'
import { tints, tokens } from '../../theme'

const CYCLES = 13 // 26 weeks = 13 bi-weekly cycles
const GRACE_DAYS = 3

/* ---------- Evidence checklist per cycle (stage-aware) ---------- */
const CHECKLISTS = [
  {
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
  {
    stage: 'Discovery — Expand',
    items: [
      { key: 'interviews_5', label: '5 more customer interviews' },
      { key: 'jtbd', label: 'Jobs-to-be-Done statements (3 personas)' },
      { key: 'competitor_map', label: 'Competitor / alternatives map' },
      { key: 'insight_note', label: 'Discovery insight note (what changed)' },
    ],
  },
  {
    stage: 'Validation — Signal',
    items: [
      { key: 'landing_page', label: 'Landing page live URL' },
      { key: 'waitlist_signups', label: 'Waitlist signups screenshot (≥25)' },
      { key: 'survey_results', label: 'Survey results (n ≥ 20)' },
      { key: 'pricing_hyp', label: 'Pricing hypothesis doc' },
    ],
  },
  {
    stage: 'Validation — Commit',
    items: [
      { key: 'loi_or_prepay', label: 'Letter of intent or pre-payment (≥1)' },
      { key: 'wizard_test', label: 'Wizard-of-Oz / concierge test log' },
      { key: 'value_prop_v2', label: 'Value prop v2 (revised)' },
      { key: 'assumption_kill', label: 'Assumptions killed / kept summary' },
    ],
  },
  {
    stage: 'MVP — Build v1',
    items: [
      { key: 'mvp_demo', label: 'MVP demo video (≤3 min)' },
      { key: 'tech_doc', label: 'Architecture / build doc' },
      { key: 'user_test_3', label: '3 user testing recordings' },
      { key: 'bug_log', label: 'Bug / iteration log' },
    ],
  },
  {
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
  {
    stage: 'Pilot — Launch',
    items: [
      { key: 'pilot_users', label: 'Pilot user list (≥5 with contact)' },
      { key: 'onboarding_flow', label: 'Onboarding flow doc' },
      { key: 'feedback_log', label: 'Structured pilot feedback log' },
      { key: 'nps_or_csat', label: 'NPS / CSAT first read' },
    ],
  },
  {
    stage: 'Pilot — Retain',
    items: [
      { key: 'retention_chart', label: 'W1/W2 retention chart' },
      { key: 'case_study', label: '1 written case study' },
      { key: 'pricing_test', label: 'Pricing test results' },
      { key: 'churn_reasons', label: 'Churn interviews (≥3)' },
    ],
  },
  {
    stage: 'Traction — Revenue',
    items: [
      { key: 'revenue_proof', label: 'Revenue proof (invoices / stripe)' },
      { key: 'cac_ltv', label: 'CAC / LTV first estimate' },
      { key: 'growth_chart', label: 'Weekly growth chart (last 8 weeks)' },
      { key: 'channel_test', label: 'Channel test summary' },
    ],
  },
  {
    stage: 'Traction — Scale readiness',
    items: [
      { key: 'unit_econ', label: 'Unit economics model' },
      { key: 'hiring_plan', label: 'Hiring / capacity plan' },
      { key: 'ops_playbook', label: 'Ops playbook v1' },
      { key: 'risk_register', label: 'Risk register' },
    ],
  },
  {
    stage: 'Final — Story',
    items: [
      { key: 'pitch_deck', label: 'Investor / defense deck v1' },
      { key: 'financial_model', label: '12-month financial model' },
      { key: 'team_bios', label: 'Team & advisors doc' },
      { key: 'traction_1pager', label: 'Traction 1-pager' },
    ],
  },
  {
    stage: 'Final — Rehearsal',
    items: [
      { key: 'pitch_v2', label: 'Deck v2 (post-mentor review)' },
      { key: 'dry_run_video', label: 'Dry-run pitch video' },
      { key: 'qa_prep', label: 'Q&A prep doc (20 questions)' },
      { key: 'next_6mo_plan', label: 'Next 6-month plan' },
    ],
  },
  {
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
]

// Evidence URLs are typed by students; only web addresses become links.
const isWebUrl = value => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

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

// Keeps the form's existing cycle -> checklist mapping in one place.
// TODO: this is offset by two (cycle 1 gets CHECKLISTS[2]); fixing it changes
// which items existing submissions are measured against, so it needs a decision.
const checklistFor = cycleNumber => CHECKLISTS[cycleNumber + 1]

// One status per cycle, shared by the cycle cards and the filters.
function cycleStatus(cycle, row, now = new Date()) {
  if (row?.submitted_at) return 'completed'
  if (cycle.deadline < now) return 'missed'
  if (row || now >= cycle.start) return 'inProgress'
  return 'upcoming'
}

const STATUS_META = {
  completed: { label: 'Completed', tint: 'green' },
  inProgress: { label: 'In Progress', tint: 'blue' },
  missed: { label: 'Missed', tint: 'red' },
  upcoming: { label: 'Upcoming', tint: 'gray' },
}

function dateRange(start, end) {
  const sameYear = start.getFullYear() === end.getFullYear()
  const from = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  const to = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${from} – ${to}`
}

function BiWeekly({ data: propData }) {
  const loaderData = useLoaderData()
  // Embedded in the admin founder profile, which already has its own page title.
  const embedded = propData !== undefined
  const data = embedded ? propData : loaderData
  const currentUser = useAuthStore(state => state.user)
  const revalidator = useRevalidator()
  const isAdmin = currentUser?.role?.name === 'admin'

  const { founder, venture, coFounders = [] } = data || {}
  const rows = data?.submissions ?? []
  const observations = data?.observations ?? []
  const evaluations = data?.evaluations ?? []
  const [selected, setSelected] = React.useState(null)
  const [message, setMessage] = React.useState('')
  const detailRef = React.useRef(null)

  const cycles = React.useMemo(
    () => computeCycles(venture?.createdAt || founder?.createdAt || new Date()),
    [venture?.createdAt, founder?.createdAt]
  )

  const currentCycle = React.useMemo(() => {
    const now = new Date()
    const c = cycles.find(c => now >= c.start && now <= c.end)
    return c?.n ?? cycles.find(c => now < c.start)?.n ?? CYCLES
  }, [cycles])

  if (!data || (!founder && !venture)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No active venture or founder profile found. Bi-weekly progress reports
          are shared across co-founders of an active venture.
        </Alert>
      </Box>
    )
  }

  const active = selected ?? currentCycle
  const activeMeta = cycles.find(c => c.n === active)
  const activeRow = rows.find(r => r.cycle_number === active)
  const submittedCount = rows.filter(r => r.submitted_at).length
  const missedCount = cycles.filter(
    c =>
      c.deadline < new Date() &&
      !rows.find(r => r.cycle_number === c.n && r.submitted_at)
  ).length

  // Each of these calls the API directly and then asks the route loader to
  // refetch, in place of the route action that used to dispatch on an intent.
  const run = async (pending, operation) => {
    setMessage(pending)

    try {
      await operation()
      setMessage('')
      revalidator.revalidate()
    } catch (err) {
      setMessage(toError(err, 'Action failed').error)
    }
  }

  const saveSubmission = (payload, submit) =>
    run(submit ? 'Submitting to faculty...' : 'Saving draft...', () =>
      submitBiWeeklyCycle({
        ...payload,
        isSubmit: submit,
        ventureId: venture?._id,
        founderId: founder?._id,
      })
    )

  const reopenSubmission = cycleNumber => {
    if (!window.confirm('Unlock to edit? Faculty will see this as re-opened.'))
      return

    return run('Unlocking...', () =>
      reopenBiWeeklySubmission({
        ventureId: venture?._id,
        founderId: founder?._id,
        cycle_number: cycleNumber,
      })
    )
  }

  const saveObservation = payload =>
    run('Saving observation...', () =>
      saveBiWeeklyObservation({
        ...payload,
        ventureId: venture?._id,
        founderId: founder?._id,
      })
    )

  const saveEvaluation = payload =>
    run('Saving evaluation...', () =>
      saveBiWeeklyEvaluation({
        ...payload,
        ventureId: venture?._id,
        founderId: founder?._id,
      })
    )

  return (
    <Stack spacing={3}>
      <Box>
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography
              variant={embedded ? 'h5' : 'h2'}
              component={embedded ? 'h2' : 'h1'}
              sx={
                embedded
                  ? { mb: 0.5 }
                  : { fontSize: { xs: '2rem', sm: '2.5rem' }, mb: 1 }
              }
            >
              Biweekly Reports
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track your progress, submit a report every two weeks, and showcase
              your journey.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/methodology"
            variant="outlined"
            startIcon={<BookIcon />}
          >
            View Guidelines
          </Button>
        </Stack>

        {(venture?.name || coFounders?.length > 0) && (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ mt: 2, flexWrap: 'wrap', alignItems: 'center' }}
          >
            {venture?.name && (
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {venture.name}
                {venture.stage && (
                  <Box
                    component="span"
                    sx={{ color: 'text.secondary', fontWeight: 400 }}
                  >
                    {' '}
                    · {venture.stageLabel ?? venture.stage}
                  </Box>
                )}
              </Typography>
            )}
            {coFounders.map(cf => (
              <Chip key={cf._id} label={cf.username} size="small" />
            ))}
          </Stack>
        )}

        {!venture && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            You are not currently linked to an active venture. Bi-weekly reports
            are shared across co-founders of your venture team.
          </Alert>
        )}
      </Box>

      <ProgressStats
        cycles={cycles}
        currentCycle={currentCycle}
        submittedCount={submittedCount}
        missedCount={missedCount}
        evaluations={evaluations}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            lg: 'minmax(0, 5fr) minmax(0, 7fr)',
          },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Stack spacing={3}>
          <AllCycles
            cycles={cycles}
            rows={rows}
            active={active}
            onSelect={n => {
              setSelected(n)
              // Side by side the report is already visible; stacked, bring it up.
              if (window.matchMedia('(min-width: 1200px)').matches) return
              requestAnimationFrame(() =>
                detailRef.current?.scrollIntoView({
                  behavior: window.matchMedia(
                    '(prefers-reduced-motion: reduce)'
                  ).matches
                    ? 'auto'
                    : 'smooth',
                  block: 'start',
                })
              )
            }}
          />
        </Stack>

        <Stack spacing={3} ref={detailRef} sx={{ scrollMarginTop: 80 }}>
          <CycleForm
            key={activeMeta.n}
            status={cycleStatus(activeMeta, activeRow)}
            cycleNumber={activeMeta.n}
            periodStart={activeMeta.start.toISOString().slice(0, 10)}
            periodEnd={activeMeta.end.toISOString().slice(0, 10)}
            deadline={activeMeta.deadline}
            existing={activeRow}
            isAdmin={isAdmin}
            onSave={saveSubmission}
            onReopen={reopenSubmission}
          />

          <MentorObservationSection
            key={`obs-${activeMeta.n}-${observations.find(o => o.cycle_number === activeMeta.n)?._id ?? 'none'}`}
            cycleNumber={activeMeta.n}
            submission={activeRow}
            observation={observations.find(
              o => o.cycle_number === activeMeta.n
            )}
            canAuthor={isAdmin}
            onSave={saveObservation}
          />

          <EvaluationSection
            key={`eval-${activeMeta.n}-${evaluations.find(e => e.checklist_id === activeMeta.n || e.month_number === Math.ceil(activeMeta.n / 2))?._id ?? 'none'}`}
            cycleNumber={activeMeta.n}
            evaluation={evaluations.find(
              e =>
                e.checklist_id === activeMeta.n ||
                e.month_number === Math.ceil(activeMeta.n / 2)
            )}
            canAuthor={isAdmin}
            onSave={saveEvaluation}
          />
        </Stack>
      </Box>

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

/* =========== All cycles (filter + cards) =========== */
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'missed', label: 'Missed' },
]

function AllCycles({ cycles, rows, active, onSelect }) {
  const [filter, setFilter] = React.useState('all')

  const items = cycles.map(c => {
    const row = rows.find(r => r.cycle_number === c.n)
    return { cycle: c, row, status: cycleStatus(c, row) }
  })
  const count = key =>
    key === 'all' ? items.length : items.filter(i => i.status === key).length
  // Hide "Missed" until something is actually missed.
  const filters = FILTERS.filter(f => f.key !== 'missed' || count('missed') > 0)
  const shown =
    filter === 'all' ? items : items.filter(i => i.status === filter)

  return (
    <Paper elevation={1} sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: '18px' }}>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        All Cycles
      </Typography>

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        role="group"
        aria-label="Filter cycles"
        sx={{ flexWrap: 'wrap', mb: 3 }}
      >
        {filters.map(f => {
          const selected = filter === f.key
          return (
            <Chip
              key={f.key}
              label={`${f.label} (${count(f.key)})`}
              onClick={() => setFilter(f.key)}
              aria-pressed={selected}
              sx={{
                height: 36,
                px: 0.5,
                fontSize: '0.875rem',
                bgcolor: selected ? tints.blue.bg : 'background.default',
                color: selected ? tints.blue.fg : 'text.primary',
                border: 1,
                borderColor: selected ? 'rgba(0, 113, 227, 0.3)' : 'divider',
                '&:hover': {
                  bgcolor: selected ? tints.blue.bg : tokens.secondaryButton,
                },
              }}
            />
          )
        })}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 1.5,
        }}
      >
        {shown.map(({ cycle, row, status }) => (
          <CycleCard
            key={cycle.n}
            cycle={cycle}
            row={row}
            status={status}
            selected={cycle.n === active}
            onClick={() => onSelect(cycle.n)}
          />
        ))}
      </Box>

      {shown.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', py: 4 }}
        >
          No cycles here yet.
        </Typography>
      )}
    </Paper>
  )
}

function StatusPill({ status }) {
  const { label, tint } = STATUS_META[status]
  const { bg, fg } = tints[tint]
  const plain = status === 'upcoming'

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: plain ? 0 : 1.25,
        py: 0.5,
        borderRadius: 1.5,
        bgcolor: plain ? 'transparent' : bg,
        color: plain ? 'text.secondary' : fg,
        fontSize: '0.875rem',
        fontWeight: 500,
      }}
    >
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: plain ? 'text.disabled' : fg,
        }}
      />
      {label}
    </Box>
  )
}

function ProgressRing({ value, status }) {
  const { fg } = tints[STATUS_META[status].tint]
  const size = 48

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={3}
        sx={{ color: 'divider', position: 'absolute', inset: 0 }}
        aria-hidden="true"
      />
      <CircularProgress
        variant="determinate"
        value={value}
        size={size}
        thickness={3}
        sx={{
          color: fg,
          position: 'absolute',
          inset: 0,
          '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
        }}
        aria-hidden="true"
      />
      {status === 'completed' && (
        <CheckmarkIcon
          sx={{
            position: 'absolute',
            inset: 0,
            m: 'auto',
            fontSize: 20,
            color: fg,
          }}
        />
      )}
    </Box>
  )
}

function CycleCard({ cycle, row, status, selected, onClick }) {
  const items = checklistFor(cycle.n)?.items ?? []
  const links = Array.isArray(row?.evidence_links) ? row.evidence_links : []
  const done = items.filter(i => links.some(l => l.check === i.key)).length
  const total = items.length
  const value =
    status === 'completed' ? 100 : total ? Math.round((done / total) * 100) : 0
  const caption = {
    completed: 'Submitted',
    inProgress: row ? 'Draft' : 'Not started',
    missed: 'Not submitted',
    upcoming: 'Not started',
  }[status]

  return (
    <ButtonBase
      onClick={onClick}
      aria-current={selected ? 'true' : undefined}
      aria-label={`Cycle ${cycle.n}, ${dateRange(cycle.start, cycle.end)}, ${STATUS_META[status].label}${total ? `, ${done} of ${total} items` : ''}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2.5,
        textAlign: 'left',
        borderRadius: '14px',
        border: 1.5,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'rgba(0, 113, 227, 0.04)' : 'background.paper',
        transition: 'border-color 150ms, box-shadow 150ms, transform 100ms',
        '&:hover': { boxShadow: tokens.shadowSmall },
        '&:active': { transform: 'scale(0.98)' },
        '&.Mui-focusVisible': { boxShadow: tokens.focusRing },
        '@media (prefers-reduced-motion: reduce)': {
          '&:active': { transform: 'none' },
        },
      }}
    >
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" component="h3">
          Cycle {cycle.n}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          {dateRange(cycle.start, cycle.end)}
        </Typography>
        <StatusPill status={status} />
      </Box>

      <Box
        aria-hidden="true"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 84,
        }}
      >
        <ProgressRing value={value} status={status} />
        <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 500 }}>
          {total ? `${status === 'completed' ? total : done}/${total}` : '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      </Box>

      <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
    </ButtonBase>
  )
}

/* =========== Progress stats =========== */
const REVIEW_META = {
  green: { label: 'On track', tint: 'green' },
  yellow: { label: 'Needs attention', tint: 'orange' },
  red: { label: 'At risk', tint: 'red' },
}

function ProgressStats({
  cycles,
  currentCycle,
  submittedCount,
  missedCount,
  evaluations,
}) {
  const pct = Math.round((submittedCount / CYCLES) * 100)
  const now = new Date()
  const current = cycles.find(c => c.n === currentCycle)
  const daysLeft = current
    ? Math.ceil((current.deadline.getTime() - now.getTime()) / 86400000)
    : 0
  const latest = evaluations[0]
  const review = latest && REVIEW_META[latest.status]

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(4, minmax(0, 1fr))',
        },
        gap: { xs: 2, sm: 3 },
      }}
    >
      <StatTile
        icon={DocTextIcon}
        label="Reports submitted"
        value={
          <>
            {submittedCount}
            <Box
              component="span"
              sx={{ color: 'text.secondary', fontWeight: 400 }}
            >
              /{CYCLES}
            </Box>
          </>
        }
        progress={pct}
        detail={`${pct}% of the program`}
      />
      <StatTile
        icon={CalendarIcon}
        label="Current cycle"
        value={`Cycle ${currentCycle}`}
        detail={
          current
            ? `${dateRange(current.start, current.end)}${
                daysLeft > 0
                  ? ` · due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
                  : ''
              }`
            : null
        }
      />
      <StatTile
        icon={missedCount > 0 ? WarningIcon : CheckmarkIcon}
        tint={missedCount > 0 ? 'red' : 'green'}
        label="Missed cycles"
        value={missedCount}
        detail={
          missedCount > 0
            ? 'Ask faculty to reopen a missed cycle.'
            : 'Nothing missed so far.'
        }
      />
      <StatTile
        icon={ChartIcon}
        tint={review?.tint ?? 'gray'}
        label="Latest review"
        value={
          latest ? (
            <>
              {latest.total_score}
              <Box
                component="span"
                sx={{ color: 'text.secondary', fontWeight: 400 }}
              >
                /400
              </Box>
            </>
          ) : (
            '—'
          )
        }
        detail={
          latest
            ? `${review?.label ?? 'Reviewed'} · Month ${latest.month_number}`
            : 'Faculty review at the end of each month.'
        }
      />
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
  status,
  cycleNumber,
  periodStart,
  periodEnd,
  deadline,
  existing,
  isAdmin,
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
  // Admin view is read-only (admin cannot submit student progress). Student is locked if submitted or past deadline.
  const locked = isAdmin ? true : submitted || pastDeadline
  const checklist = checklistFor(cycleNumber)

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

  const setItemUrl = (item, url) => {
    const exists = links.some(l => l.check === item.key)
    if (!url) {
      setLinks(links.filter(l => l.check !== item.key))
    } else if (exists) {
      setLinks(links.map(l => (l.check === item.key ? { ...l, url } : l)))
    } else {
      setLinks([...links, { title: item.label, url, check: item.key }])
    }
  }
  const otherLinks = links
    .map((l, i) => ({ ...l, index: i }))
    .filter(l => !l.check)
  const updateLink = (index, patch) =>
    setLinks(links.map((x, j) => (j === index ? { ...x, ...patch } : x)))

  const [openSection, setOpenSection] = React.useState(0)
  const sectionDone = [
    requiredCount > 0 ? doneCount === requiredCount : links.some(l => l.url),
    [
      'hours_worked',
      'customer_interviews',
      'features_shipped',
      'revenue',
      'users_acquired',
      'experiments_run',
    ].some(k => Number(f[k]) > 0),
    !!f.progress_summary,
    !!(f.goals_next_cycle || f.ask_for_help),
  ]
  const days =
    Math.round(
      (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) /
        86400000
    ) + 1

  const sections = [
    {
      title: 'Deliverables & Links',
      short: 'Deliverables',
      description: checklist
        ? `What this cycle asks for · ${checklist.stage}`
        : 'Add key artifacts and links from this cycle.',
      icon: LinkIcon,
      content: (
        <Stack spacing={3}>
          {checklist && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {doneCount} of {requiredCount} required items done
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  columnGap: 3,
                  rowGap: 3,
                }}
              >
                {checklist.items.map(item => {
                  const url = links.find(l => l.check === item.key)?.url ?? ''
                  const invalid = !!url && !isWebUrl(url)
                  return (
                    <Box key={item.key}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {item.label}
                      </Typography>
                      <TextField
                        hiddenLabel
                        fullWidth
                        placeholder="https://"
                        value={url}
                        disabled={locked}
                        error={invalid}
                        onChange={e => setItemUrl(item, e.target.value.trim())}
                        helperText={
                          invalid
                            ? 'Use a full web address starting with https://'
                            : item.hint
                        }
                        slotProps={{
                          htmlInput: {
                            'aria-label': `${item.label} link`,
                            inputMode: 'url',
                          },
                          input: {
                            startAdornment: (
                              <LinkIcon
                                sx={{
                                  fontSize: 18,
                                  color: 'text.secondary',
                                  mr: 1,
                                }}
                              />
                            ),
                          },
                        }}
                      />
                      {!url && (
                        <Stack
                          component="label"
                          direction="row"
                          sx={{ alignItems: 'center', mt: 0.5, ml: -0.75 }}
                        >
                          <Checkbox
                            size="small"
                            checked={!!checked[item.key]}
                            disabled={locked}
                            onChange={e =>
                              setChecked({
                                ...checked,
                                [item.key]: e.target.checked,
                              })
                            }
                          />
                          <Typography variant="body2" color="text.secondary">
                            Done, nothing to link
                          </Typography>
                        </Stack>
                      )}
                    </Box>
                  )
                })}
              </Box>
            </Box>
          )}

          <Box>
            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1.5,
              }}
            >
              <Typography variant="subtitle2">Other links</Typography>
              {!locked && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlusIcon />}
                  onClick={() => setLinks([...links, { title: '', url: '' }])}
                >
                  Add Link
                </Button>
              )}
            </Stack>
            {otherLinks.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Call recordings, demo videos, screenshots or docs that support
                this report.
              </Typography>
            )}
            <Stack spacing={1.5}>
              {otherLinks.map(l => (
                <Stack
                  key={l.index}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ alignItems: { sm: 'center' } }}
                >
                  <TextField
                    label="Title"
                    size="small"
                    value={l.title}
                    disabled={locked}
                    fullWidth
                    onChange={e =>
                      updateLink(l.index, { title: e.target.value })
                    }
                  />
                  <TextField
                    label="Link"
                    size="small"
                    value={l.url}
                    disabled={locked}
                    fullWidth
                    error={!!l.url && !isWebUrl(l.url)}
                    onChange={e => updateLink(l.index, { url: e.target.value })}
                  />
                  {!locked && (
                    <IconButton
                      aria-label="Remove link"
                      onClick={() =>
                        setLinks(links.filter((_, j) => j !== l.index))
                      }
                    >
                      <TrashIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      ),
    },
    {
      title: 'Metrics',
      short: 'Metrics',
      description: 'Key numbers from this cycle.',
      icon: ChartIcon,
      content: (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
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
      ),
    },
    {
      title: 'Progress & Learnings',
      short: 'Progress',
      description: "What you did, what worked, what didn't, key learnings.",
      icon: DocTextIcon,
      content: (
        <Stack spacing={2}>
          <Area
            label="Progress summary: what did you do these two weeks? (required)"
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
              gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' },
              gap: 2,
              alignItems: 'start',
            }}
          >
            <TextField
              label="Mentor meeting date"
              type="date"
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
        </Stack>
      ),
    },
    {
      title: 'Next Cycle & Support',
      short: 'Next cycle',
      description: 'Goals for the next cycle and where you need help.',
      icon: TargetIcon,
      content: (
        <Stack spacing={2}>
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
        </Stack>
      ),
    },
  ]

  const missing = []
  if (requiredCount > 0 && doneCount < requiredCount)
    missing.push(
      `${requiredCount - doneCount} required item${requiredCount - doneCount > 1 ? 's' : ''}`
    )
  if (!f.progress_summary) missing.push('a progress summary')

  return (
    <Paper elevation={1} sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: '18px' }}>
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="h5" component="h2">
            Cycle {cycleNumber} – Biweekly Report
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {dateRange(new Date(periodStart), new Date(periodEnd))} ({days}{' '}
            days)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Due{' '}
            {deadline.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
            {!pastDeadline &&
              !submitted &&
              ` · ${daysToDeadline} day${daysToDeadline === 1 ? '' : 's'} left`}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          {isAdmin && <Chip size="small" label="Admin view (read-only)" />}
          <StatusPill status={status} />
          {isAdmin && (submitted || pastDeadline) && existing && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onReopen(cycleNumber)}
            >
              Reopen for Student
            </Button>
          )}
        </Stack>
      </Stack>

      <ReportStepper
        steps={sections.map(sec => sec.short)}
        active={openSection}
        done={sectionDone}
        onSelect={setOpenSection}
      />

      <Stack spacing={1.5}>
        {sections.map((sec, i) => (
          <ReportSection
            key={sec.title}
            number={i + 1}
            title={sec.title}
            description={sec.description}
            icon={sec.icon}
            done={sectionDone[i]}
            open={openSection === i}
            onToggle={() => setOpenSection(openSection === i ? -1 : i)}
            onNext={
              i < sections.length - 1 ? () => setOpenSection(i + 1) : undefined
            }
          >
            {sec.content}
          </ReportSection>
        ))}
      </Stack>

      <Box sx={{ mt: 3 }}>
        {isAdmin ? (
          <Alert severity="info">
            {submitted
              ? `Submission received from ${
                  existing?.submitted_by?.username
                    ? `${existing.submitted_by.username} (on behalf of venture)`
                    : 'venture team'
                } on ${new Date(existing.submitted_at).toLocaleDateString()}. Admin view is read-only.`
              : 'Venture team has not submitted for this cycle yet.'}
          </Alert>
        ) : (
          <>
            {existing?.submitted_by?.username && (
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}
              >
                Last saved by <strong>{existing.submitted_by.username}</strong>
              </Typography>
            )}

            {!locked && (
              <>
                <Stack
                  direction={{ xs: 'column-reverse', sm: 'row' }}
                  spacing={1.5}
                  sx={{ justifyContent: 'space-between' }}
                >
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<DocIcon />}
                    onClick={() => save(false)}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<SendIcon />}
                    disabled={!f.progress_summary}
                    onClick={() => save(true)}
                  >
                    Submit Report
                  </Button>
                </Stack>
                {missing.length > 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1.5, textAlign: { sm: 'right' } }}
                  >
                    Still missing: {missing.join(' and ')}.
                  </Typography>
                )}
              </>
            )}

            {locked && !submitted && (
              <Alert
                severity="error"
                icon={<LockClosedIcon fontSize="inherit" />}
              >
                Deadline passed on {deadline.toLocaleDateString()}. Contact
                faculty to reopen.
              </Alert>
            )}
          </>
        )}
      </Box>
    </Paper>
  )
}

/* =========== Report stepper + sections =========== */
function ReportStepper({ steps, active, done, onSelect }) {
  return (
    <Box
      component="ol"
      sx={{
        listStyle: 'none',
        p: 0,
        m: 0,
        my: 3,
        display: 'grid',
        gridTemplateColumns: `repeat(${steps.length}, 1fr)`,
      }}
    >
      {steps.map((label, i) => {
        const isActive = i === active
        const isDone = done[i] && !isActive
        return (
          <Box
            component="li"
            key={label}
            sx={{
              position: 'relative',
              textAlign: 'center',
              // Connector line to the next step.
              '&:not(:last-of-type)::after': {
                content: '""',
                position: 'absolute',
                top: 18,
                left: 'calc(50% + 24px)',
                right: 'calc(-50% + 24px)',
                height: '1px',
                bgcolor: 'divider',
              },
            }}
          >
            <ButtonBase
              onClick={() => onSelect(i)}
              aria-current={isActive ? 'step' : undefined}
              sx={{
                flexDirection: 'column',
                gap: 1,
                borderRadius: 2,
                px: 1,
                '&.Mui-focusVisible': { boxShadow: tokens.focusRing },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  border: 1.5,
                  borderColor: isActive
                    ? 'primary.main'
                    : isDone
                      ? 'success.main'
                      : 'divider',
                  bgcolor: isActive
                    ? 'primary.main'
                    : isDone
                      ? tints.green.bg
                      : 'background.paper',
                  color: isActive
                    ? '#fff'
                    : isDone
                      ? 'success.main'
                      : 'text.secondary',
                  transition: 'background-color 200ms, border-color 200ms',
                }}
              >
                {isDone ? <CheckmarkIcon sx={{ fontSize: 16 }} /> : i + 1}
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  display: { xs: isActive ? 'block' : 'none', sm: 'block' },
                }}
              >
                {label}
              </Typography>
            </ButtonBase>
          </Box>
        )
      })}
    </Box>
  )
}

function ReportSection({
  number,
  title,
  description,
  icon: Icon,
  done,
  open,
  onToggle,
  onNext,
  children,
}) {
  const id = `report-section-${number}`

  return (
    <Box
      sx={{
        border: 1,
        borderColor: open ? 'rgba(0, 113, 227, 0.3)' : 'divider',
        borderRadius: '14px',
        bgcolor: 'background.paper',
        transition: 'border-color 200ms',
      }}
    >
      <ButtonBase
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          textAlign: 'left',
          borderRadius: '14px',
          '&.Mui-focusVisible': { boxShadow: tokens.focusRing },
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            flexShrink: 0,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 600,
            fontSize: '0.875rem',
            bgcolor: done ? tints.green.bg : tints.blue.bg,
            color: done ? tints.green.fg : tints.blue.fg,
          }}
        >
          {done ? <CheckmarkIcon sx={{ fontSize: 14 }} /> : number}
        </Box>
        <Icon sx={{ fontSize: 22, color: 'text.secondary' }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" component="h3">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <ChevronRightIcon
          sx={{
            fontSize: 16,
            color: 'text.secondary',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        />
      </ButtonBase>

      {open && (
        <Box id={id} sx={{ px: { xs: 2, sm: 3 }, pb: 3, pt: 1 }}>
          {children}
          {onNext && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="contained"
                endIcon={<ArrowRightIcon sx={{ fontSize: 16 }} />}
                onClick={onNext}
              >
                Next
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

/* =========== Mentor observations =========== */
function MentorObservationSection({
  cycleNumber,
  submission,
  observation,
  canAuthor,
  onSave,
}) {
  const evidenceLinks = Array.isArray(submission?.evidence_links)
    ? submission.evidence_links
    : []

  const notes = observation
    ? [
        ['Strengths', observation.strengths],
        ['Concerns', observation.concerns],
        ['Action items', observation.action_items],
      ].filter(([, text]) => text)
    : []
  const reviewed = Array.isArray(observation?.evidence_reviewed)
    ? observation.evidence_reviewed.map(i => evidenceLinks[i]).filter(Boolean)
    : []

  return (
    <SectionCard
      icon={ChatIcon}
      title="Mentor observation"
      subtitle={
        observation
          ? `Cycle ${cycleNumber} · ${new Date(
              observation.updated_at ?? observation.created_at
            ).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}`
          : `Cycle ${cycleNumber}`
      }
    >
      <Stack spacing={2.5}>
        {!observation && !canAuthor && (
          <EmptyState
            icon={ChatIcon}
            title="No observation yet"
            description="Your mentor's notes on this cycle will appear here after they review your report."
          />
        )}

        {observation && (
          <>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {observation.observation}
            </Typography>

            {notes.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: `repeat(${notes.length}, minmax(0, 1fr))`,
                  },
                  gap: 1.5,
                }}
              >
                {notes.map(([label, text]) => (
                  <Box
                    key={label}
                    sx={{
                      p: 2,
                      borderRadius: '14px',
                      bgcolor: 'background.default',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {reviewed.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Evidence reviewed
                </Typography>
                <Stack spacing={0.75}>
                  {reviewed.map((link, i) => (
                    <Stack
                      key={i}
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <LinkIcon
                        sx={{ fontSize: 16, color: 'text.secondary' }}
                      />
                      {isWebUrl(link.url) ? (
                        <Link
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          variant="body2"
                        >
                          {link.title || link.url}
                        </Link>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {link.title}
                        </Typography>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </>
        )}

        {canAuthor && (
          <ObservationForm
            cycleNumber={cycleNumber}
            existing={observation}
            evidenceLinks={evidenceLinks}
            onSave={onSave}
          />
        )}
      </Stack>
    </SectionCard>
  )
}

function ObservationForm({ cycleNumber, existing, evidenceLinks, onSave }) {
  const [open, setOpen] = React.useState(false)
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
      ...f,
      evidence_reviewed: reviewed,
    })
    setOpen(false)
  }

  if (!open) {
    return (
      <Box>
        <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
          {existing ? 'Edit observation' : 'Add observation'}
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
                    sx={{
                      alignItems: 'center',
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

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
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

function EvaluationSection({ cycleNumber, evaluation, canAuthor, onSave }) {
  const monthNumber = Math.ceil(cycleNumber / 2)
  const [open, setOpen] = React.useState(false)
  const [scores, setScores] = React.useState({
    execution_score: evaluation?.execution_score ?? 0,
    customer_score: evaluation?.customer_score ?? 0,
    business_score: evaluation?.business_score ?? 0,
    behavior_score: evaluation?.behavior_score ?? 0,
  })

  const totalScore =
    (Number(scores.execution_score) || 0) +
    (Number(scores.customer_score) || 0) +
    (Number(scores.business_score) || 0) +
    (Number(scores.behavior_score) || 0)

  const derivedStatus =
    totalScore >= 75 ? 'green' : totalScore >= 50 ? 'yellow' : 'red'

  const handleSave = () => {
    onSave({
      checklist_id: cycleNumber,
      month_number: monthNumber,
      year: new Date().getFullYear(),
      execution_score: Number(scores.execution_score) || 0,
      customer_score: Number(scores.customer_score) || 0,
      business_score: Number(scores.business_score) || 0,
      behavior_score: Number(scores.behavior_score) || 0,
      total_score: totalScore,
      status: derivedStatus,
    })
    setOpen(false)
  }

  const shownStatus = evaluation?.status ?? derivedStatus
  const pillars = [
    ['Execution', evaluation?.execution_score],
    ['Customer', evaluation?.customer_score],
    ['Business', evaluation?.business_score],
    ['Behavior', evaluation?.behavior_score],
  ]

  return (
    <SectionCard
      icon={KpiIcon}
      tint={evaluation ? (REVIEW_META[shownStatus]?.tint ?? 'blue') : 'blue'}
      title={`Month ${monthNumber} evaluation`}
      subtitle="Faculty score four pillars from 0 to 100."
      action={
        <>
          {evaluation && (
            <Chip
              size="small"
              label={`${evaluation.total_score ?? totalScore}/400 · ${
                REVIEW_META[shownStatus]?.label ?? shownStatus
              }`}
              sx={{
                bgcolor: tints[REVIEW_META[shownStatus]?.tint ?? 'gray'].bg,
                color: tints[REVIEW_META[shownStatus]?.tint ?? 'gray'].fg,
              }}
            />
          )}
          {canAuthor && (
            <Button
              size="small"
              variant={open ? 'outlined' : 'contained'}
              onClick={() => setOpen(!open)}
            >
              {open
                ? 'Close'
                : evaluation
                  ? 'Edit Evaluation'
                  : 'Add Evaluation'}
            </Button>
          )}
        </>
      }
    >
      {open && canAuthor ? (
        <Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 2,
              mb: 2.5,
            }}
          >
            {[
              ['execution_score', 'Execution'],
              ['customer_score', 'Customer'],
              ['business_score', 'Business'],
              ['behavior_score', 'Behavior'],
            ].map(([key, label]) => (
              <TextField
                key={key}
                label={`${label} (0–100)`}
                type="number"
                size="small"
                slotProps={{ htmlInput: { min: 0, max: 100 } }}
                value={scores[key]}
                onChange={e => setScores({ ...scores, [key]: e.target.value })}
              />
            ))}
          </Box>

          <Stack
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Total {totalScore}/400 ·{' '}
              <Box
                component="span"
                sx={{ color: tints[REVIEW_META[derivedStatus].tint].fg }}
              >
                {REVIEW_META[derivedStatus].label}
              </Box>
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button size="small" variant="contained" onClick={handleSave}>
                Save Evaluation
              </Button>
            </Stack>
          </Stack>
        </Box>
      ) : evaluation ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 1.5,
          }}
        >
          {pillars.map(([label, value = 0]) => (
            <Box
              key={label}
              sx={{ p: 2, borderRadius: '14px', bgcolor: 'background.default' }}
            >
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h5" component="p" sx={{ my: 0.5 }}>
                {value}
                <Box
                  component="span"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 400,
                    fontSize: '0.875rem',
                  }}
                >
                  /100
                </Box>
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Number(value) || 0)}
                aria-hidden="true"
                sx={{ height: 4, borderRadius: 2 }}
              />
            </Box>
          ))}
        </Box>
      ) : (
        <EmptyState
          icon={KpiIcon}
          title="Not evaluated yet"
          description={`Faculty score Execution, Customer, Business and Behavior at the end of Month ${monthNumber}.`}
        />
      )}
    </SectionCard>
  )
}

export default BiWeekly
