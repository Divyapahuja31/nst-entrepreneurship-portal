import { Fragment } from 'react'

import { Box, Divider, Typography } from '@mui/material'

import IconBadge from '../../components/IconBadge'
import SectionCard from '../../components/SectionCard'
import StatusPill from '../../components/StatusPill'
import {
  BookIcon,
  CalendarIcon,
  ChartIcon,
  KpiIcon,
  LightbulbIcon,
  PeopleIcon,
  TargetIcon,
  WarningIcon,
} from '../../components/icons'

const CREDIT_COURSES = [
  {
    title: 'Entrepreneurship Practice I',
    credits: '6 Credits · M1–3',
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
    focus: 'Business Model → Traction → Scale → Final Defense',
    components: [
      ['Business Model & Revenue Validation', '25%'],
      ['Traction & Market Progress', '25%'],
      ['Founder Reviews (Monthly)', '15%'],
      ['Final Startup Report', '15%'],
      ['Final Pitch / Demo Day', '10%'],
      ['Mentor Evaluation', '10%'],
    ],
    evidence:
      'Revenue evidence · Pilot results · Pricing experiments · Partnership discussions · Growth metrics · Unit economics · Pitch deck · Demo day · Final startup report',
    rubric: [
      'Business & Metrics 40%',
      'Customer & Market 25%',
      'Execution & Product 20%',
      'Founder Behaviour 15%',
    ],
  },
]

const MILESTONE_COURSES = [
  ['Month 1', 'Problem Validation', 'Practice I'],
  ['Month 2', 'Customer Discovery & MVP', 'Practice I'],
  ['Month 3', 'MVP & Pilot', 'Practice I'],
  ['Month 4', 'Business Model & Revenue', 'Practice II'],
  ['Month 5', 'Growth & Partnerships', 'Practice II'],
  ['Month 6', 'Final Startup Defense', 'Practice II'],
]

const PILLARS = [
  {
    icon: LightbulbIcon,
    title: 'Execution & Product',
    weight: 40,
    tlo: 'TLO-3, TLO-4',
    desc: 'Lean Startup experiments, rapid prototyping, technical architecture, feature delivery, product iterations.',
  },
  {
    icon: TargetIcon,
    title: 'Customer & Market',
    weight: 25,
    tlo: 'TLO-1, TLO-2',
    desc: 'Customer discovery, segmentation, market size (TAM/SAM/SOM), interview depth, competitive positioning.',
  },
  {
    icon: ChartIcon,
    title: 'Business & Metrics',
    weight: 20,
    tlo: 'TLO-5, TLO-6, TLO-8',
    desc: 'Business model canvas, revenue model, unit economics, traction metrics, demo-ready pitch.',
  },
  {
    icon: PeopleIcon,
    title: 'Founder Behaviour',
    weight: 15,
    tlo: 'TLO-9, TLO-10',
    desc: 'Self-direction, resilience, mentor engagement, accountability, time management, team dynamics.',
  },
]

const BAND_LABELS = [
  'Exemplary (76–100%)',
  'Proficient (51–75%)',
  'Developing (26–50%)',
  'Insufficient (0–25%)',
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
    tint: 'green',
    color: 'Green',
    title: 'On Track',
    rules: [
      'Total score ≥ 70 / 100',
      'AND no single pillar below 50% of its weight',
    ],
    note: 'Example: Execution must be ≥ 20, Customer ≥ 13, Business ≥ 10, Behaviour ≥ 8',
  },
  {
    tint: 'orange',
    color: 'Yellow',
    title: 'Warning',
    rules: [
      'Total score 50 – 69 / 100',
      'OR one pillar is below 50% of its weight but total ≥ 50',
    ],
    note: 'Faculty should flag for a 1:1 review call.',
  },
  {
    tint: 'red',
    color: 'Red',
    title: 'At Risk',
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
    tint: 'orange',
    title: 'Faculty Review Warning',
    desc: 'If a student receives Yellow in two consecutive months, faculty must schedule a formal review and document an improvement plan.',
  },
  {
    label: '2× Red',
    tint: 'red',
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

const numeric = { fontVariantNumeric: 'tabular-nums' }

// Gray group inside a section card (DESIGN.md: nested boxes, not borders).
function Group({ children, sx }) {
  return (
    <Box
      sx={[
        {
          p: { xs: 2, sm: 2.5 },
          borderRadius: '14px',
          bgcolor: 'background.default',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  )
}

function Columns({ min = 1, md = 2, lg, children }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 2, sm: 3 },
        gridTemplateColumns: {
          xs: `repeat(${min}, minmax(0, 1fr))`,
          md: `repeat(${md}, minmax(0, 1fr))`,
          ...(lg ? { lg: `repeat(${lg}, minmax(0, 1fr))` } : {}),
        },
      }}
    >
      {children}
    </Box>
  )
}

function Label({ children, sx }) {
  return (
    <Typography
      variant="subtitle2"
      component="h3"
      sx={[{ mb: 1 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      {children}
    </Typography>
  )
}

// Rows separated by hairlines: label left, optional value right.
function Rows({ items, render }) {
  return items.map((item, index) => (
    <Fragment key={index}>
      {index > 0 && <Divider />}
      <Box sx={{ py: 1.25 }}>{render(item)}</Box>
    </Fragment>
  ))
}

function Weight({ label, value, strong }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="body2" sx={strong ? { fontWeight: 600 } : null}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={[numeric, strong ? { fontWeight: 600 } : {}]}
      >
        {value}
      </Typography>
    </Box>
  )
}

function Tag({ children }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.25,
        py: 0.25,
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        color: 'text.secondary',
        fontSize: '0.8125rem',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  )
}

function CreditCourse({ course }) {
  return (
    <Group>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="subtitle1" component="h3">
          {course.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {course.credits}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        {course.focus}
      </Typography>

      <Label>Course components</Label>
      <Rows
        items={[...course.components, ['Total', '100%', true]]}
        render={([label, weight, strong]) => (
          <Weight label={label} value={weight} strong={strong} />
        )}
      />

      <Label sx={{ mt: 2.5 }}>Evidence collected</Label>
      <Typography variant="body2" color="text.secondary">
        {course.evidence}
      </Typography>

      <Label sx={{ mt: 2.5 }}>Maps to the rubric</Label>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {course.rubric.map(item => (
          <Tag key={item}>{item}</Tag>
        ))}
      </Box>
    </Group>
  )
}

function PillarCard({ icon, title, weight, tlo, desc }) {
  return (
    <Group sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
        <IconBadge icon={icon} tint="blue" size={40} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 2,
          }}
        >
          <Typography variant="subtitle1" component="h3">
            {title}
          </Typography>
          <Typography
            variant="subtitle1"
            component="p"
            sx={[numeric, { whiteSpace: 'nowrap' }]}
          >
            {weight}
            <Box
              component="span"
              sx={{ color: 'text.secondary', fontWeight: 400 }}
            >
              {' '}
              pts
            </Box>
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Syllabus {tlo}
        </Typography>
        <Typography variant="body2">{desc}</Typography>
      </Box>
    </Group>
  )
}

function RubricBands({ row }) {
  return (
    <Group>
      <Typography variant="subtitle1" component="h3" sx={{ mb: 2 }}>
        {row.pillar}
        <Box
          component="span"
          sx={[numeric, { color: 'text.secondary', fontWeight: 400 }]}
        >
          {' '}
          / {row.max}
        </Box>
      </Typography>
      <Columns md={2} lg={4}>
        {row.bands.map((band, index) => (
          <Box key={BAND_LABELS[index]}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              {BAND_LABELS[index]}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {band}
            </Typography>
          </Box>
        ))}
      </Columns>
    </Group>
  )
}

// Month on the left, what happens on the right; stacks on phones.
function MonthRow({ month, title, children }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 0.25, sm: 3 },
        gridTemplateColumns: { xs: '1fr', sm: '96px minmax(0, 1fr)' },
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {month}
      </Typography>
      <Box>
        <Typography variant="subtitle2">{title}</Typography>
        {children}
      </Box>
    </Box>
  )
}

function Step({ number, title, desc }) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Box
        aria-hidden="true"
        sx={[
          numeric,
          {
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: 'background.default',
            color: 'primary.main',
            fontSize: '0.875rem',
            fontWeight: 600,
          },
        ]}
      >
        {number}
      </Box>
      <Box>
        <Typography variant="subtitle2" component="h3">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {desc}
        </Typography>
      </Box>
    </Box>
  )
}

export default function Methodology() {
  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <Box sx={{ mb: { xs: 4, sm: 5 } }}>
        <Typography
          variant="h2"
          component="h1"
          sx={{ fontSize: { xs: '2rem', sm: '2.5rem' }, mb: 1 }}
        >
          Methodology
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The rubric, KPIs, milestones and status logic behind every monthly
          review.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: { xs: 2, sm: 3 } }}>
        <SectionCard
          icon={BookIcon}
          title="Academic Credit Structure"
          subtitle="Two 6-credit courses (12 credits) so the university can issue formal grades."
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The courses re-aggregate the monthly evaluations below into
            semester-level grades. The rubric, KPIs and status logic themselves
            don&apos;t change.
          </Typography>

          <Columns md={2}>
            {CREDIT_COURSES.map(course => (
              <CreditCourse key={course.title} course={course} />
            ))}
          </Columns>

          <Label sx={{ mt: 3 }}>Monthly milestones by course</Label>
          <Rows
            items={MILESTONE_COURSES}
            render={([month, focus, course]) => (
              <Box
                sx={{
                  display: 'grid',
                  gap: { xs: 0.5, sm: 3 },
                  alignItems: 'center',
                  gridTemplateColumns: {
                    xs: '1fr auto',
                    sm: '96px minmax(0, 1fr) auto',
                  },
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                >
                  {month}
                </Typography>
                <Typography variant="body2">
                  <Box
                    component="span"
                    sx={{
                      display: { sm: 'none' },
                      color: 'text.secondary',
                    }}
                  >
                    {month} ·{' '}
                  </Box>
                  {focus}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {course}
                </Typography>
              </Box>
            )}
          />
        </SectionCard>

        <SectionCard
          icon={KpiIcon}
          title="Four-Pillar Rubric"
          subtitle="Every monthly evaluation is scored out of 100 across four pillars from the syllabus TLOs and CLOs."
        >
          <Columns md={2}>
            {PILLARS.map(pillar => (
              <PillarCard key={pillar.title} {...pillar} />
            ))}
          </Columns>

          <Label sx={{ mt: 4, mb: 0.5 }}>Score bands</Label>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pick the band that fits the evidence, then place the score within
            it. For example, a Proficient founder on Execution scores 21–30 out
            of 40.
          </Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            {RUBRIC_BANDS.map(row => (
              <RubricBands key={row.pillar} row={row} />
            ))}
          </Box>
        </SectionCard>

        <SectionCard
          icon={CalendarIcon}
          title="Six-Month Milestones"
          subtitle="Each month has a focus that maps to the rubric pillars."
        >
          <Rows
            items={TIMELINE}
            render={([month, phase, deliverables]) => (
              <MonthRow month={month} title={phase}>
                <Typography variant="body2" color="text.secondary">
                  {deliverables}
                </Typography>
              </MonthRow>
            )}
          />
        </SectionCard>

        <SectionCard
          icon={WarningIcon}
          tint="orange"
          title="Status Logic"
          subtitle="Each month the status is computed from the total score and per-pillar minimums. Faculty can override it."
        >
          <Columns md={3}>
            {STATUS_RULES.map(({ tint, color, title, rules, note }) => (
              <Group key={title}>
                <Box sx={{ mb: 1.5 }}>
                  <StatusPill label={`${color} · ${title}`} tint={tint} />
                </Box>
                {rules.map(rule => (
                  <Typography key={rule} variant="body2" sx={{ mb: 0.5 }}>
                    {rule}
                  </Typography>
                ))}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1.5 }}
                >
                  {note}
                </Typography>
              </Group>
            ))}
          </Columns>

          <Label sx={{ mt: 4 }}>Review board triggers</Label>
          <Rows
            items={REVIEW_TRIGGERS}
            render={({ label, tint, title, desc }) => (
              <Box
                sx={{
                  display: 'grid',
                  gap: { xs: 1, sm: 3 },
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '120px minmax(0, 1fr)',
                  },
                  alignItems: 'start',
                }}
              >
                <Box>
                  <StatusPill label={label} tint={tint} />
                </Box>
                <Box>
                  <Typography variant="subtitle2">{title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {desc}
                  </Typography>
                </Box>
              </Box>
            )}
          />
        </SectionCard>

        <SectionCard
          icon={ChartIcon}
          title="KPIs Tracked"
          subtitle="Founders report these monthly as objective evidence for the rubric scores."
        >
          <Rows
            items={KPIS}
            render={([category, metrics, pillar]) => (
              <Box
                sx={{
                  display: 'grid',
                  gap: { xs: 0.5, sm: 3 },
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '96px minmax(0, 1fr) 160px',
                  },
                }}
              >
                <Typography variant="subtitle2">{category}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {metrics}
                </Typography>
                <Typography variant="body2">{pillar}</Typography>
              </Box>
            )}
          />
        </SectionCard>

        <SectionCard
          icon={PeopleIcon}
          title="How Faculty Use This"
          subtitle="From monthly submissions to the Academic Review Board."
        >
          <Columns md={2}>
            {STEPS.map(([title, desc], index) => (
              <Step key={title} number={index + 1} title={title} desc={desc} />
            ))}
          </Columns>
        </SectionCard>
      </Box>
    </Box>
  )
}
