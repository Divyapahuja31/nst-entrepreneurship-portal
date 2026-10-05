import { Box, LinearProgress, Paper, Typography } from '@mui/material'

import IconBadge from './IconBadge'
import { tints } from '../theme'

// One number with its label and context. Lay tiles out in equal columns.
export default function StatTile({
  icon,
  tint = 'blue',
  label,
  value,
  detail,
  progress,
}) {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 2.5,
        borderRadius: '18px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
        <IconBadge icon={icon} tint={tint} size={32} />
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>

      <Typography variant="h4" component="p" sx={{ mb: 0.5 }}>
        {value}
      </Typography>

      {progress !== undefined && (
        <LinearProgress
          variant="determinate"
          value={progress}
          aria-hidden="true"
          sx={{
            height: 6,
            borderRadius: 3,
            my: 1,
            bgcolor: 'background.default',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              bgcolor: tints[tint].fg,
            },
          }}
        />
      )}

      {detail && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 'auto', pt: 0.5 }}
        >
          {detail}
        </Typography>
      )}
    </Paper>
  )
}
