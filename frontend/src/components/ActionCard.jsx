import { ButtonBase, Box, Typography } from '@mui/material'

import IconBadge from './IconBadge'
import { ChevronRightIcon } from './icons'
import { tokens } from '../theme'

// A whole-card button: icon badge, title, one line of description and a
// call to action. Pass `onClick`, or `component={RouterLink}` with `to`.
export default function ActionCard({
  icon,
  tint,
  title,
  description,
  cta,
  ...buttonProps
}) {
  return (
    <ButtonBase
      {...buttonProps}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        gap: 2,
        p: 3,
        borderRadius: '18px',
        bgcolor: 'background.paper',
        boxShadow: tokens.shadowSmall,
        transition: 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 200ms',
        '&:hover': { boxShadow: tokens.cardShadow, transform: 'translateY(-2px)' },
        '&:active': { transform: 'scale(0.98)' },
        '&.Mui-focusVisible': { boxShadow: tokens.focusRing },
        '@media (prefers-reduced-motion: reduce)': {
          '&:hover, &:active': { transform: 'none' },
        },
      }}
    >
      <IconBadge icon={icon} tint={tint} />

      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>

      {cta && (
        <Typography
          variant="body2"
          sx={{
            color: 'primary.main',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
          }}
        >
          {cta}
          <ChevronRightIcon sx={{ fontSize: 14 }} />
        </Typography>
      )}
    </ButtonBase>
  )
}
