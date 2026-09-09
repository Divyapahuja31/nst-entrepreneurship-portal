/* Demo data for the bi-weekly portal (no backend calls). */
export async function biWeeklyLoader() {
  const anchor = new Date()
  // Puts "today" inside cycle 6, with cycle 5's deadline already passed
  // so the demo shows submitted, missed, draft and upcoming cycles at once.
  anchor.setDate(anchor.getDate() - 78)
  const anchorISO = anchor.toISOString()

  const founder = {
    id: 'demo-founder',
    startup_name: 'Persistent AI',
    lifecycle_stage: 'mvp',
    lifecycle_status: 'on track',
    intake_completed_at: anchorISO,
    created_at: anchorISO,
  }

  const submissions = [
    {
      id: 's1',
      cycle_number: 1,
      submitted_at: anchorISO,
      progress_summary:
        'Ran first discovery sprint with ops leads at 3 logistics firms.',
      wins: 'Two firms agreed to a follow-up walkthrough.',
      blockers: 'Hard to reach decision makers without a warm intro.',
      hours_worked: 62,
      customer_interviews: 4,
      features_shipped: 0,
      revenue: 0,
      users_acquired: 0,
      experiments_run: 1,
      mentor_meeting_date: '',
      mentor_meeting_notes: 'Narrow the ICP before building anything.',
      goals_next_cycle: 'Five more interviews, draft JTBD statements.',
      ask_for_help: 'Intros to mid-market logistics operators.',
      evidence_links: [
        {
          title: 'Problem statement (1-pager)',
          url: 'https://example.com/problem-1pager',
          check: 'problem_doc',
        },
        {
          title: '3 customer discovery interviews',
          url: 'https://example.com/interviews',
          check: 'interviews_3',
        },
        {
          title: 'Riskiest assumptions map',
          url: '',
          check: 'assumptions_map',
          self_confirmed: true,
        },
        {
          title: '2-week goals doc',
          url: '',
          check: 'goals_2w',
          self_confirmed: true,
        },
      ],
    },
    {
      id: 's2',
      cycle_number: 2,
      submitted_at: anchorISO,
      progress_summary: 'Expanded discovery to 3 personas and mapped rivals.',
      wins: 'Clear wedge: reconciliation, not routing.',
      blockers: 'Persona 3 (finance) gave contradictory signals.',
      hours_worked: 70,
      customer_interviews: 6,
      features_shipped: 0,
      revenue: 0,
      users_acquired: 0,
      experiments_run: 2,
      mentor_meeting_date: '',
      mentor_meeting_notes: 'Drop persona 3 for now.',
      goals_next_cycle: 'Landing page + waitlist.',
      ask_for_help: 'Feedback on pricing hypothesis.',
      evidence_links: [
        {
          title: '5 more customer interviews',
          url: 'https://example.com/interviews-2',
          check: 'interviews_5',
        },
        {
          title: 'JTBD statements',
          url: '',
          check: 'jtbd',
          self_confirmed: true,
        },
        {
          title: 'Competitor / alternatives map',
          url: 'https://example.com/competitors',
          check: 'competitor_map',
        },
      ],
    },
    {
      id: 's3',
      cycle_number: 3,
      submitted_at: anchorISO,
      progress_summary: 'Landing page live, 41 waitlist signups in 9 days.',
      wins: '41 signups, 22 survey responses.',
      blockers: 'Signup-to-call conversion is weak.',
      hours_worked: 66,
      customer_interviews: 3,
      features_shipped: 1,
      revenue: 0,
      users_acquired: 41,
      experiments_run: 3,
      mentor_meeting_date: '',
      mentor_meeting_notes: 'Test pricing on the next 10 calls.',
      goals_next_cycle: 'Get one LOI.',
      ask_for_help: 'Template for a light LOI.',
      evidence_links: [
        {
          title: 'Landing page live URL',
          url: 'https://example.com/landing',
          check: 'landing_page',
        },
        {
          title: 'Waitlist signups screenshot',
          url: 'https://example.com/waitlist',
          check: 'waitlist_signups',
        },
        {
          title: 'Survey results (n = 22)',
          url: 'https://example.com/survey',
          check: 'survey_results',
        },
      ],
    },
    {
      id: 's4',
      cycle_number: 4,
      submitted_at: anchorISO,
      progress_summary: 'Concierge pilot with one firm, first LOI signed.',
      wins: 'LOI from a 40-truck operator.',
      blockers: 'Manual workflow does not scale past 2 customers.',
      hours_worked: 74,
      customer_interviews: 5,
      features_shipped: 2,
      revenue: 0,
      users_acquired: 3,
      experiments_run: 2,
      mentor_meeting_date: '',
      mentor_meeting_notes: 'Start building the real thing.',
      goals_next_cycle: 'MVP v1 with 3 user tests.',
      ask_for_help: 'Review of the data model.',
      evidence_links: [
        {
          title: 'Letter of intent',
          url: 'https://example.com/loi',
          check: 'loi_or_prepay',
        },
        {
          title: 'Concierge test log',
          url: 'https://example.com/concierge-log',
          check: 'wizard_test',
        },
      ],
    },
    // Cycle 5 intentionally missing — shows as a missed cycle.
    {
      id: 's6',
      cycle_number: 6,
      submitted_at: null, // draft, current cycle
      progress_summary: 'Reworked onboarding after the first usability round.',
      wins: '',
      blockers: 'Activation metric still not instrumented.',
      hours_worked: 48,
      customer_interviews: 2,
      features_shipped: 3,
      revenue: 12000,
      users_acquired: 7,
      experiments_run: 1,
      mentor_meeting_date: '',
      mentor_meeting_notes: '',
      goals_next_cycle: '',
      ask_for_help: '',
      evidence_links: [
        {
          title: 'MVP v2 demo (post-iteration)',
          url: 'https://example.com/demo-v2',
          check: 'mvp_v2_demo',
        },
      ],
    },
  ]

  const evaluations = [
    {
      id: 'e3',
      month_number: 3,
      year: new Date().getFullYear(),
      total_score: 74,
      status: 'green',
      execution_score: 30,
      customer_score: 18,
      business_score: 14,
      behavior_score: 12,
      created_at: new Date().toISOString(),
    },
    {
      id: 'e2',
      month_number: 2,
      year: new Date().getFullYear(),
      total_score: 63,
      status: 'yellow',
      execution_score: 24,
      customer_score: 17,
      business_score: 11,
      behavior_score: 11,
      created_at: anchorISO,
    },
    {
      id: 'e1',
      month_number: 1,
      year: new Date().getFullYear(),
      total_score: 55,
      status: 'yellow',
      execution_score: 20,
      customer_score: 16,
      business_score: 9,
      behavior_score: 10,
      created_at: anchorISO,
    },
  ]

  const observations = [
    {
      id: 'o1',
      cycle_number: 4,
      author_id: 'mentor-1',
      observation:
        'Strong close on the LOI. The concierge log is honest about what broke.',
      strengths: 'Customer access, follow-through on commitments.',
      concerns: 'Still no instrumented metric to prove activation.',
      action_items: 'Define activation before writing more features.',
      evidence_reviewed: [0, 1],
      created_at: anchorISO,
      updated_at: anchorISO,
    },
  ]

  return {
    founder,
    submissions,
    evaluations,
    observations,
    role: 'admin',
    userId: 'mentor-1',
  }
}
