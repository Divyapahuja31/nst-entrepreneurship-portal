import { Link as RouterLink } from 'react-router'

import { Box, Breadcrumbs, Link, Typography } from '@mui/material'

// The top of every page: optional breadcrumbs, a large title, one line of
// subtitle and an optional action (usually the page's one contained button).
export default function PageHeader({ title, subtitle, action, breadcrumbs }) {
  return (
    <Box sx={{ mb: { xs: 4, sm: 5 } }}>
      {breadcrumbs?.length > 0 && (
        <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 1.5 }}>
          {breadcrumbs.map(crumb =>
            crumb.to ? (
              <Link
                key={crumb.label}
                component={RouterLink}
                to={crumb.to}
                color="text.secondary"
                variant="body2"
              >
                {crumb.label}
              </Link>
            ) : (
              <Typography key={crumb.label} variant="body2">
                {crumb.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{ fontSize: { xs: '2rem', sm: '2.5rem' }, mb: 1 }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
    </Box>
  )
}
