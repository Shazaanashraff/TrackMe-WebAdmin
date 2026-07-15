import { Box, Button, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { MAP_BG } from './SriLankaRouteMap';

// Shared shell for every auth-adjacent page (forgot-password request/verify/reset) so
// they match the sign-in page's dark design language instead of the old generic Card+gradient look.
export const ACCENT = '#3F6FF3';
export const ACCENT_HOVER = '#2f56d0';
const ACCENT_LIGHT = '#7B9CFB';
const TEXT = '#F7F5EF';

export const authErrorAlertSx = {
  borderRadius: 1.5,
  backgroundColor: 'rgba(226,75,74,0.12)',
  color: '#F7C1C1',
  border: '1px solid rgba(226,75,74,0.35)',
  '& .MuiAlert-icon': { color: '#F09595' }
};

export const authWarningAlertSx = {
  borderRadius: 1.5,
  backgroundColor: 'rgba(251,207,51,0.12)',
  color: '#FCE588',
  border: '1px solid rgba(251,207,51,0.35)',
  '& .MuiAlert-icon': { color: '#FBCF33' }
};

export const authFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: TEXT,
    backgroundColor: 'rgba(255,255,255,0.03)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.16)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.32)' },
    '&.Mui-focused fieldset': { borderColor: ACCENT_LIGHT }
  },
  '& .MuiInputLabel-root': { color: 'rgba(247,245,239,0.55)' },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT_LIGHT },
  '& .MuiOutlinedInput-input::placeholder': { color: 'rgba(247,245,239,0.35)', opacity: 1 }
};

export function AuthCard({ title, subtitle, children, onBack, backLabel = 'Back' }) {
  return (
    <Box sx={{ minHeight: '100vh', width: '100%', display: 'grid', placeItems: 'center', px: 2, backgroundColor: MAP_BG }}>
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Typography sx={{ color: TEXT, fontSize: { xs: '1.5rem', md: '1.75rem' }, fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography sx={{ color: 'rgba(247,245,239,0.6)', fontSize: '0.875rem', mt: 0.75, mb: 3 }}>
          {subtitle}
        </Typography>

        {children}

        {onBack ? (
          <Button
            startIcon={<ArrowBackRoundedIcon fontSize="small" />}
            onClick={onBack}
            sx={{
              mt: 2,
              color: 'rgba(247,245,239,0.6)',
              textTransform: 'none',
              '&:hover': { backgroundColor: 'rgba(63,111,243,0.1)', color: ACCENT_LIGHT }
            }}
          >
            {backLabel}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
