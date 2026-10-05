import { useEffect, useLayoutEffect, useRef } from 'react'
import { Box, Paper, Typography } from '@mui/material'

import { tokens } from '../theme'

// Critically damped curve: settles without overshoot, like a damping-1.0 spring.
const SETTLE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function AuthScreen({
  title,
  subtitle,
  children,
  stepKey,
  direction = 1,
  shakeOn,
}) {
  const cardRef = useRef(null)
  const contentRef = useRef(null)
  const isFirstRender = useRef(true)

  // Slide the new step in along the direction of travel.
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const el = contentRef.current
    if (!el?.animate) return

    const from = prefersReducedMotion()
      ? { opacity: 0 }
      : { opacity: 0, transform: `translateX(${direction * 24}px)` }

    el.animate([from, { opacity: 1, transform: 'none' }], {
      duration: prefersReducedMotion() ? 150 : 360,
      easing: SETTLE,
    })
  }, [stepKey, direction])

  // A rejected attempt shakes the card, the way the macOS login window does.
  useEffect(() => {
    const el = cardRef.current
    if (!shakeOn || !el?.animate || prefersReducedMotion()) return

    el.animate(
      [0, -10, 10, -8, 8, -4, 4, 0].map(x => ({
        transform: `translateX(${x}px)`,
      })),
      { duration: 420, easing: 'ease-out' }
    )
  }, [shakeOn])

  return (
    <Box sx={{ px: { xs: 0, sm: 2 }, py: { xs: 2, sm: 8 } }}>
      <Paper
        ref={cardRef}
        elevation={0}
        sx={{
          maxWidth: 480,
          mx: 'auto',
          px: { xs: 3, sm: 7 },
          py: { xs: 3, sm: 6 },
          borderRadius: { xs: 0, sm: '18px' },
          boxShadow: {
            xs: 'none',
            sm: tokens.cardShadow,
          },
          '@media (prefers-contrast: more)': {
            border: 1,
            borderColor: 'text.primary',
          },
        }}
      >
        <Box ref={contentRef}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{ fontSize: { xs: '1.75rem', sm: '2rem' }, mb: 1 }}
            >
              {title}
            </Typography>

            {subtitle && (
              <Typography
                variant="body1"
                color="textSecondary"
                sx={{ maxWidth: 360, mx: 'auto' }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {children}
        </Box>
      </Paper>
    </Box>
  )
}

export default AuthScreen
