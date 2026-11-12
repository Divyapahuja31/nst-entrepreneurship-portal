import { Box, Stack, Typography } from '@mui/material'
import { LETTER_GRADES } from '@nst/shared/reportCards.js'

export default function GradeLegend({ legend }) {
  return (
    <Box>
      <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
        Grade meanings
      </Typography>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
          gap: 1,
        }}
      >
        {LETTER_GRADES.map(grade => (
          <Stack
            key={grade}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.25, sm: 1 }}
            sx={{
              bgcolor: 'background.default',
              p: 1.5,
              borderRadius: '12px',
              alignItems: 'baseline',
            }}
          >
            <Typography component="dt" variant="subtitle2">
              {grade}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              color="text.secondary"
              sx={{ overflowWrap: 'anywhere' }}
            >
              {legend[grade]}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Box>
  )
}
