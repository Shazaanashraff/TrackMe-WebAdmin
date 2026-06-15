import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
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
import { motion } from 'framer-motion';

const leftSlides = [
  {
    src: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1400&q=80',
    label: 'Live fleet visibility',
    description: 'Follow route activity and keep operations coordinated.'
  },
  {
    src: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80',
    label: 'Manager oversight',
    description: 'Monitor trips, drivers, and service status in one place.'
  },
  {
    src: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1400&q=80',
    label: 'Every route in view',
    description: 'Keep TrackMe aligned with every movement that matters.'
  }
];

export function LoginPage({
  onLogin,
  onForgotPassword = () => {},
  loading,
  error,
  roleTitle = 'Sign In',
  roleSubtitle = 'Secure access for TrackMe manager accounts.',
  usernameLabel = 'Email',
  usernamePlaceholder = 'manager@trackme.com',
  submitLabel = 'Sign In'
}) {
  const [form, setForm] = useState({ email: '', password: '', rememberMe: true });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((currentIndex) => (currentIndex + 1) % leftSlides.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, []);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin(form);
  };

  const currentSlide = leftSlides[activeSlide];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        backgroundColor: '#f3f4f6'
      }}
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <Box
          sx={{
            width: '100vw',
            minHeight: '100vh',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1.1fr' },
            borderRadius: 0,
            backgroundColor: '#1f1f1f',
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              position: 'relative',
              minHeight: { xs: 260, md: 620 },
              p: { xs: 2.5, md: 3 },
              borderRight: { md: '1px solid rgba(255, 255, 255, 0.08)' },
              background:
                'radial-gradient(140% 90% at 10% 10%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.02) 35%, rgba(0,0,0,0.2) 100%), linear-gradient(165deg, #4b4b4b 0%, #202020 55%, #111111 100%)',
              overflow: 'hidden'
            }}
          >
            <Box
              component={motion.img}
              key={currentSlide.src}
              src={currentSlide.src}
              alt={currentSlide.label}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'grayscale(100%) contrast(1.05) brightness(0.55)',
                transform: 'scale(1.03)'
              }}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1.03 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: 0.5,
                background:
                  'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.16) 38%, transparent 62%), linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 48%, transparent 100%)'
              }}
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
              <Typography sx={{ color: '#f5f5f5', fontWeight: 800, letterSpacing: '0.08em' }}>TrackMe</Typography>
            </Stack>

            <Box sx={{ position: 'absolute', left: 28, bottom: 28, zIndex: 1 }}>
              <Typography sx={{ color: '#f3f4f6', fontSize: { xs: '1.15rem', md: '1.6rem' }, fontWeight: 700, lineHeight: 1.2 }}>
                {currentSlide.label}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: { xs: '0.8rem', md: '0.92rem' }, fontWeight: 500, mt: 0.5 }}>
                {currentSlide.description}
              </Typography>
              <Stack direction="row" spacing={0.8} sx={{ mt: 2, alignItems: 'center' }}>
                {leftSlides.map((slide, index) => (
                  <Box
                    key={slide.src}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveSlide(index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        setActiveSlide(index);
                      }
                    }}
                    sx={{
                      width: 40,
                      height: 24,
                      borderRadius: 999,
                      overflow: 'hidden',
                      border: index === activeSlide ? '1px solid rgba(255,255,255,0.92)' : '1px solid rgba(255,255,255,0.25)',
                      opacity: index === activeSlide ? 1 : 0.72,
                      cursor: 'pointer'
                    }}
                  >
                    <Box
                      component="img"
                      src={slide.src}
                      alt={`Slide ${index + 1}`}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) brightness(0.7)' }}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>

          <Box
            sx={{
              backgroundColor: '#ffffff',
              p: { xs: 2.5, md: 4.5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <Typography sx={{ color: '#1f2937', fontSize: { xs: '1.55rem', md: '2rem' }, fontWeight: 800 }}>
              {roleTitle}
            </Typography>
            <Typography sx={{ color: '#6b7280', fontSize: '0.85rem', mt: 0.8, mb: 2.8 }}>
              {roleSubtitle}
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 1.5 }}>
              <TextField
                size="small"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                label={usernameLabel}
                placeholder={usernamePlaceholder}
                required
                fullWidth
                InputLabelProps={{ sx: { color: '#6b7280' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#1f2937',
                    backgroundColor: '#f9fafb',
                    '& fieldset': { borderColor: '#d1d5db' },
                    '&:hover fieldset': { borderColor: '#9ca3af' },
                    '&.Mui-focused fieldset': { borderColor: '#4b5563' }
                  }
                }}
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
                      >
                        {passwordVisible ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                InputLabelProps={{ sx: { color: '#6b7280' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#1f2937',
                    backgroundColor: '#f9fafb',
                    '& fieldset': { borderColor: '#d1d5db' },
                    '&:hover fieldset': { borderColor: '#9ca3af' },
                    '&.Mui-focused fieldset': { borderColor: '#4b5563' }
                  }
                }}
              />

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.2 }}>
                <FormControlLabel
                  control={<Checkbox size="small" checked={form.rememberMe} onChange={(event) => setForm((prev) => ({ ...prev, rememberMe: event.target.checked }))} sx={{ color: '#6b7280', '&.Mui-checked': { color: '#374151' } }} />}
                  label={<Typography sx={{ color: '#6b7280', fontSize: '0.75rem' }}>Remember me</Typography>}
                  sx={{ m: 0 }}
                />
                <Link component="button" type="button" underline="hover" onClick={onForgotPassword} sx={{ color: '#4b5563', fontSize: '0.75rem' }}>Forgot password?</Link>
              </Stack>

              {error ? <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert> : null}

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 0.3,
                  py: 1.2,
                  borderRadius: 1.5,
                  background: 'linear-gradient(180deg, #4b5563 0%, #1f2937 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  '&:hover': { background: 'linear-gradient(180deg, #5b6470 0%, #2b3646 100%)' }
                }}
              >
                {loading ? <CircularProgress size={18} color="inherit" /> : submitLabel}
              </Button>
            </Box>

            <Divider sx={{ my: 2.3, borderColor: '#e5e7eb' }} />
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                component="a"
                href="mailto:mohamedshazaan7@gmail.com?subject=TrackMe%20Admin%20Support"
                variant="outlined"
                sx={{
                  borderColor: '#d1d5db',
                  color: '#374151',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  minWidth: 210
                }}
              >
                Contact admin
              </Button>
            </Box>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
}
