import { createTheme } from '@mui/material/styles'

// The portal's one theme, applied to every route in main.jsx.
// DESIGN.md at the repo root explains these choices; change both together.

const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif'

export const tokens = {
  page: '#f5f5f7',
  surface: '#ffffff',
  field: '#ffffff',
  fieldBorder: '#d2d2d7',
  fieldHover: '#86868b',
  text: '#1d1d1f',
  secondary: '#6e6e73',
  accent: '#0071e3',
  accentHover: '#0077ed',
  accentTint: 'rgba(0, 113, 227, 0.1)',
  link: '#0066cc',
  secondaryButton: '#e8e8ed',
  secondaryButtonHover: '#dcdce1',
  error: '#e30000',
  errorSurface: '#fff5f5',
  success: '#248a3d',
  warning: '#b25000',
  divider: '#d2d2d7',
  hairline: 'rgba(0, 0, 0, 0.08)',
  chrome: 'rgba(250, 250, 252, 0.8)',
  focusRing: '0 0 0 4px rgba(0, 125, 250, 0.3)',
  shadowSmall: '0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)',
  cardShadow: '0 2px 6px rgba(0, 0, 0, 0.04), 0 12px 40px rgba(0, 0, 0, 0.06)',
  shadowLarge:
    '0 8px 24px rgba(0, 0, 0, 0.08), 0 24px 64px rgba(0, 0, 0, 0.12)',
}

// Icon badges: a tinted rounded square behind an icon, colored by meaning.
export const tints = {
  blue: { bg: 'rgba(0, 113, 227, 0.1)', fg: '#0071e3' },
  green: { bg: 'rgba(36, 138, 61, 0.12)', fg: '#248a3d' },
  orange: { bg: 'rgba(178, 80, 0, 0.12)', fg: '#b25000' },
  red: { bg: 'rgba(227, 0, 0, 0.08)', fg: '#e30000' },
  gray: { bg: '#e8e8ed', fg: '#6e6e73' },
}

const t = tokens

// Frosted material for bars that float over content (header, sidebar).
export const chromeMaterial = {
  backgroundColor: t.chrome,
  backdropFilter: 'saturate(180%) blur(20px)',
  WebkitBackdropFilter: 'saturate(180%) blur(20px)',
  '@media (prefers-reduced-transparency: reduce)': {
    backgroundColor: t.page,
    backdropFilter: 'none',
  },
}

// Three depths only: resting (1-4), raised cards (5-12), overlays (13-24).
const shadows = [
  'none',
  ...Array(4).fill(t.shadowSmall),
  ...Array(8).fill(t.cardShadow),
  ...Array(12).fill(t.shadowLarge),
]

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: t.accent, dark: t.accentHover, contrastText: '#fff' },
    error: { main: t.error },
    success: { main: t.success },
    warning: { main: t.warning },
    text: { primary: t.text, secondary: t.secondary },
    background: { default: t.page, paper: t.surface },
    divider: t.hairline,
  },
  shape: { borderRadius: 12 },
  shadows,
  typography: {
    fontFamily: SYSTEM_FONT,
    // Apple's web type scale (apple.com). Display sizes are tracked slightly
    // open, 21-32px most of all; body text is tracked tight. Never mix these.
    h1: {
      fontSize: '3rem',
      fontWeight: 600,
      lineHeight: 1.083,
      letterSpacing: '-0.003em',
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.1,
      letterSpacing: 0,
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.125,
      letterSpacing: '0.004em',
    },
    h4: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.143,
      letterSpacing: '0.007em',
    },
    h5: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.167,
      letterSpacing: '0.009em',
    },
    h6: {
      fontSize: '1.3125rem',
      fontWeight: 600,
      lineHeight: 1.19,
      letterSpacing: '0.011em',
    },
    subtitle1: {
      fontSize: '1.0625rem',
      fontWeight: 600,
      lineHeight: 1.47,
      letterSpacing: '-0.022em',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.43,
      letterSpacing: '-0.016em',
    },
    body1: {
      fontSize: '1.0625rem',
      lineHeight: 1.47,
      letterSpacing: '-0.022em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      letterSpacing: '-0.016em',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.33,
      letterSpacing: '-0.01em',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 1.33,
      letterSpacing: '-0.01em',
      textTransform: 'none',
    },
    button: {
      textTransform: 'none',
      fontSize: '1.0625rem',
      fontWeight: 400,
      letterSpacing: '-0.022em',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },

    // Buttons ---------------------------------------------------------------
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 980,
          transition:
            'transform 100ms ease-out, background-color 200ms, color 200ms',
          // Respond on press, not on release.
          '&:active': { transform: 'scale(0.97)' },
          '&.Mui-focusVisible': { boxShadow: t.focusRing },
          '@media (prefers-reduced-motion: reduce)': {
            '&:active': { transform: 'none' },
          },
        },
        sizeSmall: { fontSize: '0.875rem', padding: '4px 12px' },
        sizeMedium: { fontSize: '0.9375rem', padding: '7px 18px' },
        sizeLarge: { minHeight: 50, padding: '12px 24px' },
        contained: {
          '&.Mui-disabled': { opacity: 0.4 },
        },
        outlined: {
          // Secondary action: a quiet gray capsule, not an outlined box.
          border: 'none',
          backgroundColor: t.secondaryButton,
          color: t.text,
          '&:hover': {
            border: 'none',
            backgroundColor: t.secondaryButtonHover,
          },
          '&.Mui-disabled': { border: 'none', opacity: 0.5 },
        },
        text: {
          padding: '6px 10px',
        },
      },
      variants: [
        {
          // Disabled primary stays blue, just dimmed, as on Apple's pages.
          props: { variant: 'contained', color: 'primary' },
          style: {
            '&.Mui-disabled': { backgroundColor: t.accent, color: '#fff' },
          },
        },
        {
          props: { variant: 'text', color: 'primary' },
          style: { color: t.link },
        },
        // Colored secondary buttons keep their meaning as a tinted capsule.
        {
          props: { variant: 'outlined', color: 'error' },
          style: {
            color: t.error,
            backgroundColor: 'rgba(227, 0, 0, 0.08)',
            '&:hover': { backgroundColor: 'rgba(227, 0, 0, 0.14)' },
          },
        },
        {
          props: { variant: 'outlined', color: 'success' },
          style: {
            color: t.success,
            backgroundColor: 'rgba(36, 138, 61, 0.1)',
            '&:hover': { backgroundColor: 'rgba(36, 138, 61, 0.16)' },
          },
        },
        {
          props: { variant: 'outlined', color: 'warning' },
          style: {
            color: t.warning,
            backgroundColor: 'rgba(178, 80, 0, 0.1)',
            '&:hover': { backgroundColor: 'rgba(178, 80, 0, 0.16)' },
          },
        },
      ],
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: t.secondary,
          '&.Mui-focusVisible': { boxShadow: t.focusRing },
        },
      },
    },

    // Fields ----------------------------------------------------------------
    // One field style everywhere: white, 12px corners, label inside the box.
    // Fields without a visible label must pass `hiddenLabel`.
    MuiTextField: { defaultProps: { variant: 'filled' } },
    MuiFormControl: { defaultProps: { variant: 'filled' } },
    MuiSelect: { defaultProps: { variant: 'filled' } },
    MuiFilledInput: {
      defaultProps: { disableUnderline: true },
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: t.field,
          border: `1px solid ${t.fieldBorder}`,
          transition: 'border-color 150ms, box-shadow 150ms',
          '&:hover': { backgroundColor: t.field, borderColor: t.fieldHover },
          '&.Mui-focused': {
            backgroundColor: t.field,
            borderColor: t.accent,
            boxShadow: t.focusRing,
          },
          '&.Mui-error': {
            borderColor: t.error,
            backgroundColor: t.errorSurface,
          },
          '&.Mui-disabled': {
            backgroundColor: t.page,
            borderColor: t.hairline,
          },
          '@media (prefers-contrast: more)': { borderColor: t.text },
        },
        input: {
          letterSpacing: '-0.022em',
          // Chrome paints autofilled inputs blue past the rounded border;
          // repaint them in the field color and round every corner.
          '&:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 100px ${t.field} inset`,
            WebkitTextFillColor: t.text,
            caretColor: t.text,
            borderRadius: 'inherit',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: t.secondary,
          letterSpacing: '-0.016em',
          '&.Mui-focused': { color: t.secondary },
          '&.Mui-error': { color: t.secondary },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: { marginLeft: 4, fontSize: '0.75rem', letterSpacing: 0 },
      },
    },

    // Surfaces --------------------------------------------------------------
    MuiPaper: {
      styleOverrides: {
        outlined: { borderColor: t.hairline, borderRadius: 18 },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderRadius: 18, boxShadow: t.shadowSmall },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 18, boxShadow: t.shadowLarge },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.3125rem',
          fontWeight: 600,
          letterSpacing: '0.011em',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '12px 24px 20px', gap: 8 } },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 12, marginTop: 4, boxShadow: t.shadowLarge },
      },
    },
    MuiPopover: {
      styleOverrides: { paper: { borderRadius: 12 } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(29, 29, 31, 0.92)',
          borderRadius: 8,
          fontSize: '0.75rem',
          padding: '6px 10px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, fontSize: '0.875rem', alignItems: 'center' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, letterSpacing: '-0.01em' },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: t.hairline,
          color: t.secondary,
          fontSize: '0.875rem',
          '&::before, &::after': { borderColor: t.divider },
        },
      },
    },
    MuiLink: {
      defaultProps: { underline: 'hover' },
      styleOverrides: { root: { color: t.link } },
    },

    // Data ------------------------------------------------------------------
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: t.hairline },
        head: {
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: t.secondary,
          letterSpacing: 0,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, fontSize: '0.9375rem' },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 2, borderRadius: 2 },
      },
    },

    // App shell -------------------------------------------------------------
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: {
          ...chromeMaterial,
          color: t.text,
          borderBottom: `1px solid ${t.hairline}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          ...chromeMaterial,
          borderRight: `1px solid ${t.hairline}`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: t.accentTint,
            color: t.accent,
            '& .MuiListItemIcon-root': { color: t.accent },
            '&:hover': { backgroundColor: 'rgba(0, 113, 227, 0.14)' },
          },
        },
      },
    },
  },
})

export default theme
