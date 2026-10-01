import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useLoaderData } from 'react-router'

import ActionQueue from '../../components/ActionQueue'
import BarChart from '../../components/BarChart'
import ChartCard from '../../components/ChartCard'
import HorizontalBars from '../../components/HorizontalBars'
import VentureCheckIns from '../../components/VentureCheckIns'

// Health is per venture, so the last four cards add up to the first.
const cards = [
  {
    id: 1,
    title: 'Ventures',
    data: 'ventures',
    description: 'Ventures in the program.',
    color: 'primary.main',
  },
  {
    id: 2,
    title: 'On Track',
    data: 'onTrack',
    description: 'Average KPI score of 70 or more.',
    color: 'success.main',
  },
  {
    id: 3,
    title: 'Watch',
    data: 'watch',
    description: 'Average KPI score of 40 to 69. Needs mentorship.',
    color: 'warning.main',
  },
  {
    id: 4,
    title: 'At Risk',
    data: 'atRisk',
    description: 'Average KPI score below 40. Needs intervention.',
    color: 'error.main',
  },
  {
    id: 5,
    title: 'No reviews yet',
    data: 'noReviews',
    description: 'No graded KPIs yet, so health is unknown.',
    color: 'text.disabled',
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

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1">
          Portfolio overview
        </Typography>
        <Typography color="text.secondary">
          {ventureCount} ventures · {overview?.founders ?? 0} founders
        </Typography>
      </Box>

      <ActionQueue actions={actions} />

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        }}
      >
        {cards.map(card => (
          <Card
            key={card.id}
            variant="outlined"
            sx={{ borderLeft: 4, borderLeftColor: card.color }}
          >
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {card.title}
              </Typography>
              <Typography variant="h4" component="p">
                {overview?.[card.data] ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {card.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
        }}
      >
        <ChartCard
          title="Average KPI score by month"
          subtitle={`Graded KPIs in ${new Date().getFullYear()}, out of 100`}
          empty={!hasScores}
          emptyMessage="No KPIs have been graded yet. Monthly scores appear here once they are."
        >
          <BarChart kpiDistribution={kpi} />
        </ChartCard>
        <ChartCard
          title="Ventures by stage"
          empty={!ventureCount}
          emptyMessage="No ventures yet."
        >
          <HorizontalBars data={stages} label="Ventures" />
        </ChartCard>
      </Box>

      <VentureCheckIns
        checkIns={checkIns}
        ventureCount={ventureCount}
        inactiveDays={inactiveDays}
      />

      {/* A single campus is just the venture total again. */}
      {campuses.length > 1 && (
        <ChartCard title="Ventures by campus">
          <HorizontalBars
            data={campuses.map(({ name, count }) => ({ label: name, count }))}
            label="Ventures"
          />
        </ChartCard>
      )}
    </Stack>
  )
}

export default Index
