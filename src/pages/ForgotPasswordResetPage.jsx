import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../api';

export function ForgotPasswordResetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = location.state?.email || '';
  const initialResetToken = location.state?.resetToken || '';
  const [email, setEmail] = useState(initialEmail);
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!email || !resetToken) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)' }}>
        <Paper elevation={0} sx={{ width: '100%', maxWidth: 520, p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid #e5e7eb' }}>
          <Stack spacing={1.2} sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', color: '#111827' }}>Reset your password</Typography>
            <Typography sx={{ color: '#6b7280' }}>Start the recovery flow again so we can attach a fresh reset token.</Typography>
          </Stack>

          <Alert severity="warning">The reset step needs the verification link from the OTP page.</Alert>

          <Button
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate('/forgot-password')}
            sx={{ mt: 3, color: '#374151' }}
          >
            Back to recovery email
          </Button>
        </Paper>
      </Box>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await adminApi.resetPasswordWithToken(email, resetToken, password);
      navigate('/login', {
        replace: true,
        state: { passwordResetSuccess: true }
      });
    } catch (requestError) {
      setError(requestError.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)' }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 560, p: { xs: 3, md: 4 }, borderRadius: 4, border: '1px solid #e5e7eb' }}>
        <Stack spacing={1.2} sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', color: '#111827' }}>Create a new password</Typography>
          <Typography sx={{ color: '#6b7280' }}>Use the verification code to complete the password reset for your TrackMe account.</Typography>
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
            label="New password"
            type="password"
            required
            fullWidth
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <TextField
            label="Confirm password"
            type="password"
            required
            fullWidth
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Button type="submit" variant="contained" disabled={loading} sx={{ py: 1.2 }}>
            {loading ? 'Updating...' : 'Reset password'}
          </Button>
        </Box>

        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate('/forgot-password/verify', { state: { email } })}
          sx={{ mt: 2, color: '#374151' }}
        >
          Back
        </Button>
      </Paper>
    </Box>
  );
}
