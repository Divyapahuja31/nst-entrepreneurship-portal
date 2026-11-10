import { Box } from '@mui/material'

import { tints } from '../theme'

// A status in a tinted pill with a dot. `plain` drops the fill for states
// that shouldn't draw the eye (upcoming, draft).
export default function StatusPill({ label, tint, plain = false }) {
  const { bg, fg } = tints[tint]

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: plain ? 0 : 1.25,
        py: 0.5,
        borderRadius: 1.5,
        bgcolor: plain ? 'transparent' : bg,
        color: plain ? 'text.secondary' : fg,
        fontSize: '0.875rem',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: plain ? 'text.disabled' : fg,
        }}
      />
      {label}
    </Box>
  )
}
