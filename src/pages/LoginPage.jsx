import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { SriLankaRouteMap, MAP_BG } from '../components/auth/SriLankaRouteMap';

// Brand blue — same accent as the user-app (user-app/src/theme/tokens.js: signal[500]).
const ACCENT = '#3F6FF3';
const ACCENT_LIGHT = '#7B9CFB';
const PAGE_BG = MAP_BG;
const TEXT = '#F7F5EF';

const fieldSx = {
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

export function LoginPage({
  onLogin,
  onForgotPassword = () => {},
  loading,
  error,
  roleTitle = 'Sign in',
  usernameLabel = 'Email',
  usernamePlaceholder = 'manager@trackme.com',
  submitLabel = 'Sign in'
}) {
  const [form, setForm] = useState({ email: '', password: '', rememberMe: true });
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin(form);
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100%', display: 'flex', backgroundColor: PAGE_BG }}>
      <Box
        sx={{
          position: 'relative',
          width: '100vw',
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }
        }}
      >
        <Box sx={{ display: { xs: 'none', md: 'block' }, backgroundColor: MAP_BG }}>
          <SriLankaRouteMap />
        </Box>

        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'absolute',
            left: '50%',
            top: '27%',
            bottom: '27%',
            width: '1px',
            backgroundColor: 'rgba(255,255,255,0.14)'
          }}
        />

        <Box
          sx={{
            backgroundColor: PAGE_BG,
            p: { xs: 3, md: 6 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 380, mx: 'auto', transform: { md: 'translateX(-28px)' } }}>
            <Typography sx={{ color: TEXT, fontSize: { xs: '1.5rem', md: '1.75rem' }, fontWeight: 700, mb: 3 }}>
              {roleTitle}
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 1.75 }}>
              <TextField
                size="small"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                label={usernameLabel}
                placeholder={usernamePlaceholder}
                required
                fullWidth
                sx={fieldSx}
              />

              <TextField
                size="small"
                type={passwordVisible ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                label="Password"
                placeholder="Enter your password"
                required
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        onClick={() => setPasswordVisible((visible) => !visible)}
                        edge="end"
                        size="small"
                        aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                        sx={{ color: 'rgba(247,245,239,0.6)' }}
                      >
                        {passwordVisible ? <VisibilityRoundedIcon fontSize="small" /> : <VisibilityOffRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={fieldSx}
              />

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={form.rememberMe}
                      onChange={(event) => setForm((prev) => ({ ...prev, rememberMe: event.target.checked }))}
                      sx={{ color: 'rgba(247,245,239,0.4)', '&.Mui-checked': { color: ACCENT_LIGHT } }}
                    />
                  }
                  label={<Typography sx={{ color: 'rgba(247,245,239,0.6)', fontSize: '0.8rem' }}>Remember me</Typography>}
                  sx={{ m: 0 }}
                />
                <Link component="button" type="button" underline="hover" onClick={onForgotPassword} sx={{ color: ACCENT_LIGHT, fontSize: '0.8rem' }}>
                  Forgot password?
                </Link>
              </Stack>

              {error ? (
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 1.5,
                    backgroundColor: 'rgba(226,75,74,0.12)',
                    color: '#F7C1C1',
                    border: '1px solid rgba(226,75,74,0.35)',
                    '& .MuiAlert-icon': { color: '#F09595' }
                  }}
                >
                  {error}
                </Alert>
              ) : null}

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 0.5,
                  py: 1.2,
                  borderRadius: 1.5,
                  background: ACCENT,
                  color: '#ffffff',
                  fontWeight: 700,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': { background: '#2f56d0', boxShadow: 'none' }
                }}
              >
                {loading ? <CircularProgress size={18} color="inherit" /> : submitLabel}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
