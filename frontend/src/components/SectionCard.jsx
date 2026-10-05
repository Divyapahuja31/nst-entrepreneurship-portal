import { Box, Paper, Typography } from '@mui/material'

import IconBadge from './IconBadge'

// The one card used for page sections: 18px corners, 24px padding, and a
// header of optional icon badge + title + one-line subtitle + right action.
export default function SectionCard({
  icon,
  tint = 'blue',
  title,
  subtitle,
  action,
  children,
  sx,
}) {
  const hasHeader = Boolean(title || action)

  return (
    <Paper
      elevation={1}
      sx={[
        { p: { xs: 2.5, sm: 3 }, borderRadius: '18px', height: '100%' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {hasHeader && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
            mb: children ? 2.5 : 0,
          }}
        >
          {icon && <IconBadge icon={icon} tint={tint} size={36} />}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h2">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {action}
            </Box>
          )}
        </Box>
      )}
      {children}
    </Paper>
  )
}
