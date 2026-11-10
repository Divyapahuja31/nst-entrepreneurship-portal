import { Box } from '@mui/material'

import { tints } from '../theme'

// A tinted rounded square behind an icon, like the badges in Apple's Settings.
export default function IconBadge({ icon: Icon, tint = 'blue', size = 44 }) {
  const { bg, fg } = tints[tint]

  return (
    <Box
      aria-hidden="true"
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: `${Math.round(size * 0.27)}px`,
        bgcolor: bg,
        color: fg,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Icon sx={{ fontSize: size * 0.55 }} />
    </Box>
  )
}
