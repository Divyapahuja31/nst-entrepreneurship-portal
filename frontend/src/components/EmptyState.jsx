import { Box, Typography } from '@mui/material'

import IconBadge from './IconBadge'

// What a section shows before it has content: icon, short heading and one
// sentence saying what will appear and when. Never a bare "No data".
export default function EmptyState({ icon, title, description, action }) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 3,
        px: 2,
        borderRadius: '14px',
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ display: 'inline-flex', mb: 1.5 }}>
        <IconBadge icon={icon} tint="gray" size={44} />
      </Box>
      <Typography variant="subtitle1" component="p">
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 360, mx: 'auto' }}
      >
        {description}
      </Typography>
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  )
}
