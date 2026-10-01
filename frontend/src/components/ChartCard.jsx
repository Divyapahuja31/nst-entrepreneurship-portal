import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

// A titled panel for a chart. When there is nothing to plot it explains why,
// rather than drawing an empty or all-zero chart.
export default function ChartCard({
  title,
  subtitle,
  empty = false,
  emptyMessage,
  children,
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" component="h2" fontWeight={600}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {empty ? (
          <Box
            sx={{
              minHeight: 200,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              px: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
