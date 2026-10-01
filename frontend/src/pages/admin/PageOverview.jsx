import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActionArea from '@mui/material/CardActionArea'

import BarChart from '../../components/BarChart'
import DonutChart from '../../components/DonutChart'
import HorizontalBars from '../../components/HorizontalBars'
import { useLoaderData } from 'react-router'

// Health is per venture, so the last four cards add up to the first.
const cards = [
  {
    id: 1,
    title: 'Ventures',
    data: 'ventures',
    description: 'Ventures in the program.',
  },
  {
    id: 2,
    title: 'On Track',
    data: 'onTrack',
    description: 'Average KPI score of 70 or more.',
  },
  {
    id: 3,
    title: 'Watch',
    data: 'watch',
    description: 'Average KPI score of 40 to 69. Needs mentorship.',
  },
  {
    id: 4,
    title: 'At Risk',
    data: 'atRisk',
    description: 'Average KPI score below 40. Needs intervention.',
  },
  {
    id: 5,
    title: 'No reviews yet',
    data: 'noReviews',
    description: 'No graded KPIs yet, so health is unknown.',
  },
]

function Index() {
  const { result, kpi, overview } = useLoaderData()

  return (
    <>
      <Typography variant="h2">Portfolio overview.</Typography>

      <Typography variant="h6">
        A live read on every founder pursuing the startup track — health, stage,
        and momentum.
      </Typography>
      <hr />
      <br />

      <Box
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 2,
        }}
      >
        {cards.map(card => (
          <Card key={card.id} sx={{ height: '100%' }}>
            <CardActionArea
              sx={{
                height: '100%',
                '&[data-active]': {
                  backgroundColor: 'action.selected',
                  '&:hover': {
                    backgroundColor: 'action.selectedHover',
                  },
                },
              }}
            >
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="h5" component="div">
                  {card.title}
                </Typography>
                <Typography variant="h5" component="div">
                  {overview?.[card.data] ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {card.description}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
      <Box
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '8fr 2fr',
          gap: 2,
        }}
      >
        <BarChart kpiDistribution={kpi} />
        <DonutChart stage={result['stage']} />
      </Box>
      <HorizontalBars campus={result['campus']} />
    </>
  )
}

export default Index
