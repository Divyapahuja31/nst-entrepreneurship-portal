import { Box } from '@mui/material'
import { useLoaderData } from 'react-router'

import ActionQueue from '../../components/ActionQueue'
import BarChart from '../../components/BarChart'
import ChartCard from '../../components/ChartCard'
import HorizontalBars from '../../components/HorizontalBars'
import PageHeader from '../../components/PageHeader'
import StatTile from '../../components/StatTile'
import VentureCheckIns from '../../components/VentureCheckIns'
import {
  ChartIcon,
  CheckCircleIcon,
  HourglassIcon,
  WarningIcon,
} from '../../components/icons'

// Health is per startup, so the four tiles add up to the startup count.
const HEALTH = [
  {
    key: 'onTrack',
    label: 'On track',
    icon: CheckCircleIcon,
    tint: 'green',
    detail: 'Average KPI score of 70 or more',
  },
  {
    key: 'watch',
    label: 'Watch',
    icon: HourglassIcon,
    tint: 'orange',
    detail: 'Average 40 to 69, needs mentorship',
  },
  {
    key: 'atRisk',
    label: 'At risk',
    icon: WarningIcon,
    tint: 'red',
    detail: 'Average below 40, needs intervention',
  },
  {
    key: 'noReviews',
    label: 'No reviews yet',
    icon: ChartIcon,
    tint: 'gray',
    detail: 'No graded KPIs, so health is unknown',
  },
]

function Index() {
  const {
    actions,
    checkIns,
    inactiveDays,
    kpi,
    overview,
    stages = [],
    campuses = [],
  } = useLoaderData()
  const ventureCount = overview?.ventures ?? 0
  const hasScores = Object.values(kpi ?? {}).some(score => score != null)
  // The most recent month with a graded KPI, for the chart's subtitle.
  const latest = Object.entries(kpi ?? {})
    .filter(([, score]) => typeof score === 'number')
    .at(-1)
  const year = new Date().getFullYear()
  const scoreSubtitle = latest
    ? `Out of 100, by month in ${year}. Latest: ${Math.round(latest[1])} in ${
        latest[0].charAt(0).toUpperCase() + latest[0].slice(1)
      }.`
    : `Out of 100, by month in ${year}.`

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        title="Overview"
        subtitle={`${ventureCount} startups · ${overview?.founders ?? 0} founders`}
      />

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, sm: 3 },
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
      >
        <ActionQueue actions={actions} />

        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2, sm: 3 },
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
          }}
        >
          {HEALTH.map(item => {
            const value = overview?.[item.key] ?? 0
            return (
              <StatTile
                key={item.key}
                icon={item.icon}
                tint={item.tint}
                label={item.label}
                value={value}
                progress={ventureCount ? (value / ventureCount) * 100 : 0}
                detail={item.detail}
              />
            )
          })}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2, sm: 3 },
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: 'minmax(0, 7fr) minmax(0, 5fr)',
            },
          }}
        >
          <ChartCard
            title="Average KPI Score"
            subtitle={scoreSubtitle}
            empty={!hasScores}
            emptyMessage="Monthly scores appear here once KPIs are graded."
          >
            <BarChart kpiDistribution={kpi} />
          </ChartCard>
          <ChartCard
            title="Startups by Stage"
            empty={!ventureCount}
            emptyMessage="Approved startups will show up here."
          >
            <HorizontalBars data={stages} label="Startups" />
          </ChartCard>
        </Box>

        <VentureCheckIns
          checkIns={checkIns}
          ventureCount={ventureCount}
          inactiveDays={inactiveDays}
        />

        {/* A single campus is just the startup total again. */}
        {campuses.length > 1 && (
          <ChartCard title="Startups by Campus">
            <HorizontalBars
              data={campuses.map(({ name, count }) => ({ label: name, count }))}
              label="Startups"
            />
          </ChartCard>
        )}
      </Box>
    </Box>
  )
}

export default Index
