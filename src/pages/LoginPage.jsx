import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { motion } from 'framer-motion';

export function LoginPage({
  onLogin,
  loading,
  error,
  roleTitle = 'Super Admin Sign In',
  roleSubtitle = 'Secure access for global fleet management operations.',
  usernameLabel = 'Email',
  usernamePlaceholder = 'superadmin@company.com',
  submitLabel = 'Enter Control Tower'
}) {
  const [form, setForm] = useState({ email: '', password: '' });
  const leftImages = [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80'
  ];

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin(form);
  };

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
              component="img"
              src={leftImages[0]}
              alt="Monochrome landscape"
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'grayscale(100%) contrast(1.05) brightness(0.55)',
                transform: 'scale(1.03)'
              }}
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
              <Typography sx={{ color: '#f5f5f5', fontWeight: 800, letterSpacing: '0.08em' }}>ACEBUS</Typography>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  color: '#e5e7eb',
                  borderColor: 'rgba(255,255,255,0.22)',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  fontSize: '0.68rem',
                  px: 1.4,
                  py: 0.4,
                  minWidth: 'unset'
                }}
              >
                Back to Website
              </Button>
            </Stack>

            <Box sx={{ position: 'absolute', left: 28, bottom: 28, zIndex: 1 }}>
              <Typography sx={{ color: '#f3f4f6', fontSize: { xs: '1.15rem', md: '1.6rem' }, fontWeight: 700, lineHeight: 1.2 }}>
                Capture Clarity,
                <br />
                Control Operations
              </Typography>
              <Stack direction="row" spacing={0.8} sx={{ mt: 2 }}>
                {leftImages.map((img, index) => (
                  <Box
                    key={img}
                    sx={{
                      width: 34,
                      height: 22,
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: index === 0 ? '1px solid rgba(255,255,255,0.85)' : '1px solid rgba(255,255,255,0.35)',
                      opacity: index === 0 ? 1 : 0.72
                    }}
                  >
                    <Box
                      component="img"
                      src={img}
                      alt={`Preview ${index + 1}`}
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
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                label="Password"
                placeholder="Enter your password"
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

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.2 }}>
                <FormControlLabel
                  control={<Checkbox size="small" defaultChecked sx={{ color: '#6b7280', '&.Mui-checked': { color: '#374151' } }} />}
                  label={<Typography sx={{ color: '#6b7280', fontSize: '0.75rem' }}>Remember me</Typography>}
                  sx={{ m: 0 }}
                />
                <Link href="#" underline="hover" sx={{ color: '#4b5563', fontSize: '0.75rem' }}>Forgot password?</Link>
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
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: '#d1d5db',
                  color: '#374151',
                  textTransform: 'none',
                  fontSize: '0.8rem'
                }}
              >
                Workspace Help
              </Button>
              <Button
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: '#d1d5db',
                  color: '#374151',
                  textTransform: 'none',
                  fontSize: '0.8rem'
                }}
              >
                Contact Admin
              </Button>
            </Stack>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
}
