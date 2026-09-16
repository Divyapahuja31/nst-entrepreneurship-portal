import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import BarChartIcon from '@mui/icons-material/BarChart'
import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HandshakeIcon from '@mui/icons-material/Handshake'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import ScheduleIcon from '@mui/icons-material/Schedule'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import { StyledTableCell, StyledTableRow } from '../../components/Table.style'

const CREDIT_COURSES = [
  {
    title: 'Entrepreneurship Practice I',
    credits: '6 Credits · M1–3',
    color: 'info',
    focus: 'Discovery → MVP → Validation',
    components: [
      ['Customer Discovery & Problem Validation', '25%'],
      ['MVP Development & Product Progress', '30%'],
      ['Founder Reviews (Monthly)', '20%'],
      ['Documentation & Reporting', '10%'],
      ['Mentor Evaluation', '15%'],
    ],
    evidence:
      'Customer interviews · Problem validation reports · ICP definition · MVP screenshots · Product demos · Iteration logs · Mentor feedback · Monthly progress reports',
    rubric: [
      'Customer & Market 40%',
      'Execution & Product 40%',
      'Founder Behaviour 20%',
    ],
  },
  {
    title: 'Entrepreneurship Practice II',
    credits: '6 Credits · M4–6',
    color: 'success',
    focus: 'Business Model → Traction → Scale → Final Defense',
    components: [
      ['Business Model & Revenue Validation', '25%'],
      ['Traction & Market Progress', '25%'],
      ['Founder Reviews (Monthly)', '15%'],
      ['Final Venture Report', '15%'],
      ['Final Pitch / Demo Day', '10%'],
      ['Mentor Evaluation', '10%'],
    ],
    evidence:
      'Revenue evidence · Pilot results · Pricing experiments · Partnership discussions · Growth metrics · Unit economics · Pitch deck · Demo day · Final venture report',
    rubric: [
      'Business & Metrics 40%',
      'Customer & Market 25%',
      'Execution & Product 20%',
      'Founder Behaviour 15%',
    ],
  },
]

const MILESTONE_COURSES = [
  ['Month 1', 'Problem Validation', 'Practice I', 'info'],
  ['Month 2', 'Customer Discovery & MVP', 'Practice I', 'info'],
  ['Month 3', 'MVP & Pilot', 'Practice I', 'info'],
  ['Month 4', 'Business Model & Revenue', 'Practice II', 'success'],
  ['Month 5', 'Growth & Partnerships', 'Practice II', 'success'],
  ['Month 6', 'Final Venture Defense', 'Practice II', 'success'],
]

const PILLARS = [
  {
    icon: LightbulbIcon,
    title: 'Execution & Product',
    weight: 40,
    color: 'info',
    tlo: 'TLO-3, TLO-4',
    desc: 'Lean Startup experiments, rapid prototyping, technical architecture, feature delivery, product iterations.',
  },
  {
    icon: TrackChangesIcon,
    title: 'Customer & Market',
    weight: 25,
    color: 'success',
    tlo: 'TLO-1, TLO-2',
    desc: 'Customer discovery, segmentation, market size (TAM/SAM/SOM), interview depth, competitive positioning.',
  },
  {
    icon: BarChartIcon,
    title: 'Business & Metrics',
    weight: 20,
    color: 'warning',
    tlo: 'TLO-5, TLO-6, TLO-8',
    desc: 'Business model canvas, revenue model, unit economics, traction metrics, demo-ready pitch.',
  },
  {
    icon: HandshakeIcon,
    title: 'Founder Behaviour',
    weight: 15,
    color: 'error',
    tlo: 'TLO-9, TLO-10',
    desc: 'Self-direction, resilience, mentor engagement, accountability, time management, team dynamics.',
  },
]

const RUBRIC_BANDS = [
  {
    pillar: 'Execution & Product',
    max: 40,
    bands: [
      'Ships multiple iterations, working MVP with user testing evidence, disciplined experiment cadence, clear technical roadmap.',
      'Prototype in market with 1–2 iterations, experiments run but incomplete learning loops, roadmap partial.',
      'Early prototype only, few iterations, weak experiment design, limited technical progress.',
      'No shipped artefact, no experiments, no roadmap or backlog.',
    ],
  },
  {
    pillar: 'Customer & Market',
    max: 25,
    bands: [
      '15+ deep interviews, sharp ICP, quantified TAM/SAM/SOM, competitive map with clear wedge.',
      '8–14 interviews, ICP defined, market sized with assumptions, basic competitor analysis.',
      '1–7 interviews, vague ICP, market size guessed, competitors listed without analysis.',
      'No interviews logged, no ICP, no market sizing.',
    ],
  },
  {
    pillar: 'Business & Metrics',
    max: 20,
    bands: [
      'Validated revenue model, pricing tested with customers, defensible unit economics, traction KPIs trending up.',
      'BMC complete, pricing hypothesis stated, early revenue or LOIs, some KPIs tracked.',
      'BMC partial, no pricing tests, no revenue, KPIs inconsistent.',
      'No business model, no metrics tracked.',
    ],
  },
  {
    pillar: 'Founder Behaviour',
    max: 15,
    bands: [
      'Proactive, all mentor sessions attended, submissions on time, reflective on failure, strong team dynamics.',
      'Attends most sessions, mostly on time, receptive to feedback, workable team.',
      'Misses sessions, late submissions, defensive to feedback, team friction.',
      'Disengaged, missed multiple deadlines, no mentor contact, team dysfunction.',
    ],
  },
]

const TIMELINE = [
  [
    'Month 1',
    'Discovery & Problem Validation',
    '10+ customer interviews, pain-point hypothesis, initial segmentation',
  ],
  [
    'Month 2',
    'MVP & Prototype',
    'Working prototype, feature list, 3+ iterations based on feedback',
  ],
  [
    'Month 3',
    'Market Pilot & Business Model',
    'Early pilot results, completed BMC, revenue model clarity',
  ],
  [
    'Month 4',
    'Business Model & Revenue',
    'Pricing tested, unit economics estimated, traction KPIs tracked',
  ],
  [
    'Month 5',
    'Scaling & Partnerships',
    'Partnership conversations, growth plan, 5+ assumptions invalidated',
  ],
  [
    'Month 6',
    'Final Evaluation',
    'Investor-ready pitch deck, demo link, revenue evidence, complete track record',
  ],
]

const STATUS_RULES = [
  {
    icon: CheckCircleIcon,
    color: 'success',
    title: 'Green (On Track)',
    rules: [
      'Total score ≥ 70 / 100',
      'AND no single pillar below 50% of its weight',
    ],
    note: 'Example: Execution must be ≥ 20, Customer ≥ 13, Business ≥ 10, Behaviour ≥ 8',
  },
  {
    icon: WarningAmberIcon,
    color: 'warning',
    title: 'Yellow (Warning)',
    rules: [
      'Total score 50 – 69 / 100',
      'OR one pillar is below 50% of its weight but total ≥ 50',
    ],
    note: 'Faculty should flag for a 1:1 review call.',
  },
  {
    icon: CancelIcon,
    color: 'error',
    title: 'Red (At Risk)',
    rules: [
      'Total score < 50 / 100',
      'OR multiple pillars below 50% of their weight',
    ],
    note: 'Triggers Academic Review Board escalation.',
  },
]

const REVIEW_TRIGGERS = [
  {
    label: '2× Yellow',
    color: 'warning',
    title: 'Faculty Review Warning',
    desc: 'If a student receives Yellow in two consecutive months, faculty must schedule a formal review and document an improvement plan.',
  },
  {
    label: '2× Red',
    color: 'error',
    title: 'Academic Review Board',
    desc: 'If a student receives Red in two consecutive months, the case is escalated to the Academic Review Board to decide on continuation or return to internship track.',
  },
]

const KPIS = [
  [
    'Discovery',
    'Customer interviews conducted, iterations this month, assumptions invalidated, key learnings documented',
    'Customer & Market',
  ],
  [
    'Product',
    'Features shipped, demo link, technical milestones reached',
    'Execution & Product',
  ],
  [
    'Traction',
    'Sign-ups / pilots, revenue (if any), partnerships in discussion',
    'Business & Metrics',
  ],
  [
    'Growth',
    'Experiments run, failures documented, pivot evidence',
    'Founder Behaviour',
  ],
]

const STEPS = [
  [
    'Founders Submit Monthly',
    'Each founder fills in their KPIs and a self-assessment before the deadline.',
  ],
  [
    'Faculty Score Each Pillar',
    'Open the founder’s profile, review evidence, and enter scores (0–100 per pillar).',
  ],
  [
    'System Auto-Calculates',
    'Total score, traffic-light status, and any review-board triggers are computed automatically.',
  ],
  [
    'Dashboard Summary',
    'Review the cohort dashboard for real-time health of all startup-track students.',
  ],
  [
    'Export for Board',
    'Use CSV export to compile cases for the Academic Review Board meeting.',
  ],
  [
    'Override if Needed',
    'Faculty can manually change a status when qualitative judgement differs from the formula.',
  ],
]

function SectionHeading({ icon: Icon, children }) {
  return (
    <Typography
      variant="h6"
      sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}
    >
      <Icon color="primary" />
      {children}
    </Typography>
  )
}

function SubHeading({ children }) {
  return (
    <Typography
      variant="overline"
      sx={{ color: 'text.secondary', display: 'block' }}
    >
      {children}
    </Typography>
  )
}

function PillarCard({ icon: Icon, title, weight, color, tlo, desc }) {
  return (
    <Card variant="outlined" sx={{ borderColor: `${color}.light` }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Icon sx={{ color: `${color}.main` }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="body2">
          <strong>Weight:</strong> {weight}%
        </Typography>
        <Typography variant="body2">
          <strong>Syllabus:</strong> {tlo}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          {desc}
        </Typography>
      </CardContent>
    </Card>
  )
}

function Step({ number, title, desc }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {number}
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {desc}
        </Typography>
      </Box>
    </Stack>
  )
}

export default function Methodology() {
  return (
    <Stack spacing={5}>
      <Box>
        <SubHeading>Methodology</SubHeading>
        <Typography variant="h2">How we evaluate.</Typography>
        <Typography
          variant="h6"
          sx={{ color: 'text.secondary', maxWidth: 720 }}
        >
          A transparent reference for faculty on the rubric, KPIs, milestones,
          and traffic-light logic behind every monthly review.
        </Typography>
        <hr />
      </Box>

      {/* Academic credit wrapper */}
      <Stack spacing={2}>
        <SectionHeading icon={MenuBookIcon}>
          0. Academic Credit Structure (12 Credits)
        </SectionHeading>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          The Startup Track is wrapped into two 6-credit courses so the
          university can issue formal grades. The underlying monthly rubric,
          KPIs and traffic-light logic remain unchanged — these courses simply
          re-aggregate the existing evaluations into semester-level grades.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
          {CREDIT_COURSES.map(course => (
            <Card
              key={course.title}
              variant="outlined"
              sx={{ borderColor: `${course.color}.light` }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {course.title}
                  </Typography>
                  <Chip
                    label={course.credits}
                    size="small"
                    variant="outlined"
                    color={course.color}
                  />
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Focus: {course.focus}
                </Typography>

                <SubHeading>Course Components</SubHeading>
                <Table size="small">
                  <TableBody>
                    {course.components.map(([label, weight]) => (
                      <StyledTableRow key={label}>
                        <StyledTableCell>{label}</StyledTableCell>
                        <StyledTableCell
                          align="right"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {weight}
                        </StyledTableCell>
                      </StyledTableRow>
                    ))}
                    <StyledTableRow>
                      <StyledTableCell sx={{ fontWeight: 600 }}>
                        Total
                      </StyledTableCell>
                      <StyledTableCell
                        align="right"
                        sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                      >
                        100%
                      </StyledTableCell>
                    </StyledTableRow>
                  </TableBody>
                </Table>

                <SubHeading>Evidence Collected</SubHeading>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {course.evidence}
                </Typography>

                <SubHeading>Maps to Existing Rubric</SubHeading>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {course.rubric.map(item => (
                    <Chip
                      key={item}
                      label={item}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Typography variant="subtitle2">
          Monthly Milestone → Credit Course Mapping
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <StyledTableCell sx={{ width: 120 }}>Month</StyledTableCell>
                <StyledTableCell>Focus</StyledTableCell>
                <StyledTableCell sx={{ width: 180 }}>
                  Credit Course
                </StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MILESTONE_COURSES.map(([month, focus, course, color]) => (
                <StyledTableRow key={month}>
                  <StyledTableCell sx={{ fontWeight: 600 }}>
                    {month}
                  </StyledTableCell>
                  <StyledTableCell>{focus}</StyledTableCell>
                  <StyledTableCell>
                    <Chip
                      label={course}
                      size="small"
                      variant="outlined"
                      color={color}
                    />
                  </StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontStyle: 'italic' }}
        >
          Note: the underlying monthly rubric, KPIs and traffic-light logic
          described in sections 1–6 below are unchanged. These two courses are
          an academic wrapper for university grading only.
        </Typography>
      </Stack>

      <Divider />

      {/* Four-pillar rubric */}
      <Stack spacing={2}>
        <SectionHeading icon={MenuBookIcon}>
          1. Four-Pillar Rubric (100 points)
        </SectionHeading>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Every monthly evaluation is scored across four pillars derived from
          the syllabus TLOs and CLOs.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
          {PILLARS.map(pillar => (
            <PillarCard key={pillar.title} {...pillar} />
          ))}
        </Box>

        <Typography variant="subtitle2">
          Detailed Scoring Rubric — Score Bands per Pillar
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Faculty use these descriptors to translate evidence into a numeric
          score for each pillar every month.
        </Typography>
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <StyledTableCell sx={{ width: 160 }}>
                  Pillar (Max)
                </StyledTableCell>
                <StyledTableCell>Exemplary (76–100%)</StyledTableCell>
                <StyledTableCell>Proficient (51–75%)</StyledTableCell>
                <StyledTableCell>Developing (26–50%)</StyledTableCell>
                <StyledTableCell>Insufficient (0–25%)</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {RUBRIC_BANDS.map(row => (
                <StyledTableRow key={row.pillar} sx={{ verticalAlign: 'top' }}>
                  <StyledTableCell sx={{ fontWeight: 600 }}>
                    {row.pillar}
                    <br />
                    <Box
                      component="span"
                      sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                    >
                      / {row.max}
                    </Box>
                  </StyledTableCell>
                  {row.bands.map((band, index) => (
                    <StyledTableCell key={index} sx={{ fontSize: 12 }}>
                      {band}
                    </StyledTableCell>
                  ))}
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontStyle: 'italic' }}
        >
          Scoring rule: select the band that fits the evidence, then place the
          score within that band. Example: a “Proficient” Execution founder
          scores 21–30 out of 40.
        </Typography>
      </Stack>

      <Divider />

      {/* Milestone timeline */}
      <Stack spacing={2}>
        <SectionHeading icon={ScheduleIcon}>
          2. Six-Month Milestone Timeline
        </SectionHeading>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Each month has a defined focus that maps directly to the rubric
          pillars above.
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <StyledTableCell sx={{ width: 120 }}>Month</StyledTableCell>
                <StyledTableCell>Phase Focus</StyledTableCell>
                <StyledTableCell>Key Deliverables / Evidence</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {TIMELINE.map(([month, phase, deliverables]) => (
                <StyledTableRow key={month}>
                  <StyledTableCell sx={{ fontWeight: 600 }}>
                    {month}
                  </StyledTableCell>
                  <StyledTableCell>{phase}</StyledTableCell>
                  <StyledTableCell>{deliverables}</StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Divider />

      {/* Status logic */}
      <Stack spacing={2}>
        <SectionHeading icon={WarningAmberIcon}>
          3. Status Logic & Traffic-Light System
        </SectionHeading>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Each month the system auto-computes a status from the total score and
          per-pillar minimums. Faculty can override manually.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {STATUS_RULES.map(({ icon: Icon, color, title, rules, note }) => (
            <Card
              key={title}
              variant="outlined"
              sx={{ borderColor: `${color}.light` }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 1, color: `${color}.main` }}
                >
                  <Icon fontSize="small" />
                  <Typography variant="subtitle2">{title}</Typography>
                </Stack>
                {rules.map(rule => (
                  <Typography key={rule} variant="body2" sx={{ mb: 0.5 }}>
                    {rule}
                  </Typography>
                ))}
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {note}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Stack>

      <Divider />

      {/* Review board triggers */}
      <Stack spacing={2}>
        <SectionHeading icon={TrackChangesIcon}>
          4. Review Board Triggers
        </SectionHeading>
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              {REVIEW_TRIGGERS.map(({ label, color, title, desc }) => (
                <Stack
                  key={label}
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                >
                  <Chip
                    label={label}
                    size="small"
                    variant="outlined"
                    color={color}
                    sx={{ flexShrink: 0 }}
                  />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary' }}
                    >
                      {desc}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Divider />

      {/* KPIs */}
      <Stack spacing={2}>
        <SectionHeading icon={BarChartIcon}>
          5. Key Performance Indicators (KPIs) Tracked
        </SectionHeading>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Founders self-report these monthly. They provide objective evidence to
          support the subjective rubric scores.
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <StyledTableCell>KPI Category</StyledTableCell>
                <StyledTableCell>Metrics</StyledTableCell>
                <StyledTableCell sx={{ width: 200 }}>
                  Linked Pillar
                </StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {KPIS.map(([category, metrics, pillar]) => (
                <StyledTableRow key={category}>
                  <StyledTableCell sx={{ fontWeight: 600 }}>
                    {category}
                  </StyledTableCell>
                  <StyledTableCell>{metrics}</StyledTableCell>
                  <StyledTableCell>
                    <Chip label={pillar} size="small" variant="outlined" />
                  </StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Divider />

      {/* How faculty use this */}
      <Stack spacing={2}>
        <SectionHeading icon={HandshakeIcon}>
          6. How Faculty Use This System
        </SectionHeading>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
          {STEPS.map(([title, desc], index) => (
            <Step key={title} number={index + 1} title={title} desc={desc} />
          ))}
        </Box>
      </Stack>
    </Stack>
  )
}
