import { createTheme } from '@mui/material/styles';

/**
 * TrackMe SOFT UI THEME
 * Inspired by Creative Tim's Soft UI / Material Dashboard
 *
 * Single source of truth for color/space/radius/shadow/type tokens. Pages should read these via
 * `theme.palette.*` / `theme.custom.*` and `sx` callbacks instead of hardcoding hex literals.
 * See docs/DESIGN_TOKENS.md for the token catalogue.
 */

// Recurring "soft UI" gradient used across sidebars, active nav items and primary CTAs.
const GRADIENT_PRIMARY = 'linear-gradient(310deg, #161616 0%, #4a4a4a 100%)';

export const darkTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2f2f2f',
      dark: '#161616',
      light: '#4a4a4a',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#5e5e5e',
      contrastText: '#ffffff'
    },
    info: {
      main: '#17c1e8'
    },
    success: {
      main: '#82d616'
    },
    warning: {
      main: '#fbcf33'
    },
    error: {
      main: '#ea0606'
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff'
    },
    divider: 'rgba(0, 0, 0, 0.08)',
    text: {
      primary: '#2f2f2f',
      secondary: '#6b7280'
    },
  },
  // Non-standard MUI keys: extra tokens the design-token pass introduces (gradients, shared
  // border color) that don't map onto an existing palette slot.
  custom: {
    gradients: {
      primary: GRADIENT_PRIMARY
    },
    border: '#d2d6da'
  },
  spacing: 8,
  shape: {
    borderRadius: 8 // Standard unit
  },
  shadows: [
    'none',
    '0 2px 12px 0 rgba(0, 0, 0, 0.05)', // xs
    '0 4px 7px -1px rgba(0, 0, 0, 0.11), 0 2px 4px -1px rgba(0, 0, 0, 0.07)', // sm
    '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // md
    '0 20px 27px 0 rgba(0, 0, 0, 0.05)', // lg (Main Card Shadow)
    ...Array(20).fill('none')
  ],
  typography: {
    fontFamily: '"Uber Move", sans-serif',
    h1: { fontWeight: 800, fontSize: '3rem' },
    h2: { fontWeight: 800, fontSize: '2.25rem' },
    h3: { fontWeight: 800, fontSize: '1.875rem' },
    h4: { fontWeight: 800, fontSize: '1.5rem' },
    h5: { fontWeight: 800, fontSize: '1.25rem' },
    h6: { fontWeight: 800, fontSize: '1rem' },
    subtitle1: { fontWeight: 700, fontSize: '0.875rem' },
    subtitle2: { fontWeight: 700, fontSize: '0.75rem' },
    body1: { fontWeight: 600, fontSize: '0.875rem' },
    body2: { fontWeight: 600, fontSize: '0.75rem' },
    button: { fontWeight: 700, textTransform: 'none', fontSize: '0.75rem' },
    caption: { fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.02em' }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16, // Fixed 1rem
          boxShadow: '0 20px 27px 0 rgba(0, 0, 0, 0.05)',
          border: 'none',
          backgroundImage: 'none'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
          }
        },
        containedPrimary: {
          background: GRADIENT_PRIMARY,
          color: '#ffffff'
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          opacity: 0.1,
          margin: '16px 0'
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #f1f5f9',
          padding: '16px',
          color: '#6b7280',
          fontSize: '0.8rem',
          fontWeight: 600
        },
        head: {
          backgroundColor: '#fff',
          color: '#adb5bd',
          fontWeight: 800,
          textTransform: 'uppercase',
          fontSize: '0.65rem',
          letterSpacing: '0.05em'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#ffffff',
            '& fieldset': {
              borderColor: '#d2d6da'
            },
            '&:hover fieldset': {
              borderColor: '#2f2f2f'
            }
          }
        }
      }
    }
  }
});
