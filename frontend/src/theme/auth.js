import { createTheme } from '@mui/material/styles'

// Theme for the signed-out screens (sign in, sign up, password reset). Values
// follow Apple's HIG: system font, 17px body, one blue accent for actions,
// capsule buttons, and light, dark and increased-contrast variants.

const FONT =
  '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI Variable Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const SCHEMES = {
  light: {
    background: '#f5f5f7',
    surface: '#ffffff',
    label: '#1d1d1f',
    secondary: '#6e6e73',
    separator: '#d2d2d7',
    fill: 'rgba(118, 118, 128, 0.12)',
    fillHover: 'rgba(118, 118, 128, 0.18)',
    link: '#0066cc',
    red: '#e9152d',
    green: '#008932',
  },
  dark: {
    background: '#000000',
    surface: '#1c1c1e',
    label: '#f5f5f7',
    secondary: '#a1a1a6',
    separator: '#424245',
    fill: 'rgba(118, 118, 128, 0.24)',
    fillHover: 'rgba(118, 118, 128, 0.32)',
    link: '#2997ff',
    red: '#ff4245',
    green: '#30d158',
  },
}

const ACCENT = '#0071e3'

export function createAuthTheme({ dark = false, highContrast = false } = {}) {
  const c = SCHEMES[dark ? 'dark' : 'light']
  const separator = highContrast ? c.secondary : c.separator

  return createTheme({
    palette: {
      mode: dark ? 'dark' : 'light',
      primary: { main: ACCENT, contrastText: '#ffffff' },
      error: { main: c.red },
      success: { main: c.green },
      background: { default: c.background, paper: c.surface },
      text: { primary: c.label, secondary: c.secondary },
      divider: separator,
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: FONT,
      // 17px body, the iOS default reading size.
      body1: {
        fontSize: '1.0625rem',
        lineHeight: 1.4706,
        letterSpacing: '-0.022em',
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.4286,
        letterSpacing: '-0.016em',
      },
      h1: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.125,
        letterSpacing: '0.004em',
      },
      button: {
        fontSize: '1.0625rem',
        fontWeight: 400,
        letterSpacing: '-0.022em',
        textTransform: 'none',
      },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true, disableRipple: true },
        styleOverrides: {
          root: {
            borderRadius: 999,
            minHeight: 44,
            paddingInline: 22,
            transition:
              'background-color 120ms ease-out, opacity 120ms ease-out',
            '&:active': { opacity: 0.7 },
            '&.Mui-focusVisible': {
              outline: `3px solid ${ACCENT}`,
              outlineOffset: 2,
            },
          },
        },
        // MUI v9 reads variant and size styles from `variants`, not from the
        // old containedPrimary / sizeLarge override keys.
        variants: [
          {
            props: { size: 'large' },
            style: { minHeight: 50, fontSize: '1.0625rem' },
          },
          {
            props: { variant: 'contained', color: 'primary' },
            style: {
              fontWeight: 600,
              '&:hover': { backgroundColor: '#0077ed' },
              '&.Mui-disabled': {
                backgroundColor: ACCENT,
                color: '#ffffff',
                opacity: 0.4,
              },
            },
          },
          {
            props: { variant: 'text' },
            style: {
              color: c.link,
              paddingInline: 12,
              '&:hover': { backgroundColor: c.fill },
            },
          },
          {
            // Secondary action: a gray capsule, so the blue one stays the only
            // prominent button on the screen.
            props: { variant: 'gray' },
            style: {
              backgroundColor: c.fill,
              color: c.label,
              fontWeight: 600,
              '&:hover': { backgroundColor: c.fillHover },
              ...(highContrast && { border: `1px solid ${separator}` }),
            },
          },
        ],
      },
      MuiIconButton: {
        defaultProps: { disableRipple: true },
        styleOverrides: {
          root: {
            width: 44,
            height: 44,
            color: c.secondary,
            '&.Mui-focusVisible': {
              outline: `3px solid ${ACCENT}`,
              outlineOffset: -3,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: c.surface,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: separator },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: c.secondary,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: ACCENT,
              borderWidth: 2,
            },
          },
          input: { fontSize: '1.0625rem' },
        },
      },
      MuiInputLabel: {
        styleOverrides: { root: { fontSize: '1.0625rem', color: c.secondary } },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: { fontSize: '0.8125rem', marginInline: 4, color: c.secondary },
        },
      },
      MuiAlert: {
        defaultProps: { variant: 'standard' },
        styleOverrides: {
          root: {
            borderRadius: 14,
            fontSize: '0.9375rem',
            alignItems: 'center',
            ...(highContrast && { border: `1px solid ${separator}` }),
          },
        },
      },
      MuiLink: {
        defaultProps: { underline: 'hover' },
        styleOverrides: { root: { color: c.link } },
      },
      MuiDivider: {
        styleOverrides: {
          root: { color: c.secondary, fontSize: '0.875rem' },
        },
      },
      MuiMenu: {
        styleOverrides: { paper: { borderRadius: 14 } },
      },
    },
  })
}
