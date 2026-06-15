import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../api';

export function ForgotPasswordVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = location.state?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await adminApi.verifyPasswordResetOtp(email, otp);
      navigate('/forgot-password/reset', {
        state: {
          email,
          resetToken: response.resetToken
        }
      });
    } catch (requestError) {
      setError(requestError.message || 'Invalid recovery code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)' }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 520, p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid #e5e7eb' }}>
        <Stack spacing={1.2} sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', color: '#111827' }}>Verify the code</Typography>
          <Typography sx={{ color: '#6b7280' }}>Enter the 6-digit code sent to your email, then create a new password.</Typography>
        </Stack>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 1.5 }}>
          <TextField
            label="Email"
            type="email"
            required
            fullWidth
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label="Recovery code"
            type="text"
            required
            fullWidth
            inputProps={{ inputMode: 'numeric', maxLength: 6 }}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Button type="submit" variant="contained" disabled={loading} sx={{ py: 1.2 }}>
            {loading ? 'Verifying...' : 'Verify code'}
          </Button>
        </Box>

        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate('/forgot-password', { state: { email } })}
          sx={{ mt: 2, color: '#374151' }}
        >
          Back
        </Button>
      </Paper>
    </Box>
  );
}
