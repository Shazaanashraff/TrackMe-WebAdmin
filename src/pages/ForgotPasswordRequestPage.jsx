import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api';

export function ForgotPasswordRequestPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await adminApi.requestPasswordResetOtp(email);
      navigate('/forgot-password/verify', { state: { email } });
    } catch (requestError) {
      setError(requestError.message || 'Unable to request recovery code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)' }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 520, p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid #e5e7eb' }}>
        <Stack spacing={1.2} sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', color: '#111827' }}>Reset your password</Typography>
          <Typography sx={{ color: '#6b7280' }}>Enter the email address linked to your TrackMe account and we’ll send a recovery code.</Typography>
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

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Button type="submit" variant="contained" disabled={loading} sx={{ py: 1.2 }}>
            {loading ? 'Sending...' : 'Send recovery code'}
          </Button>
        </Box>

        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate('/login')}
          sx={{ mt: 2, color: '#374151' }}
        >
          Back to sign in
        </Button>
      </Paper>
    </Box>
  );
}
