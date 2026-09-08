import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActionArea from '@mui/material/CardActionArea'

import BarChart from '../../components/BarChart'
import DonutChart from '../../components/DonutChart'
import HorizontalBars from '../../components/HorizontalBars'

const cards = [
  {
    id: 1,
    title: 'Founder',
    description: 'Plants are essential for all life.',
  },
  {
    id: 2,
    title: 'On Track',
    description: 'Animals are a part of nature.',
  },
  {
    id: 3,
    title: 'Watch',
    description: 'Humans depend on plants and animals for survival.',
  },
  {
    id: 4,
    title: 'At Risk',
    description: 'Humans depend on plants and animals for survival.',
  },
]

function Index() {
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
          gridTemplateColumns: 'repeat(4 , 1fr)',
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
        <BarChart />
        <DonutChart />
      </Box>
      <HorizontalBars />
    </>
  )
}

export default Index
