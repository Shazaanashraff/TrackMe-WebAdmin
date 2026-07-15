import { useState } from 'react';
import { Alert, Box, Button, TextField } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import { AuthCard, ACCENT, ACCENT_HOVER, authFieldSx, authErrorAlertSx, authWarningAlertSx } from '../components/auth/AuthCard';

export function ForgotPasswordResetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = location.state?.email || '';
  const initialResetToken = location.state?.resetToken || '';
  const [email, setEmail] = useState(initialEmail);
  const [resetToken] = useState(initialResetToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!email || !resetToken) {
    return (
      <AuthCard
        title="Reset your password"
        subtitle="Start the recovery flow again so we can attach a fresh reset token."
        onBack={() => navigate('/forgot-password')}
        backLabel="Back to recovery email"
      >
        <Alert severity="warning" sx={authWarningAlertSx}>The reset step needs the verification link from the OTP page.</Alert>
      </AuthCard>
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
    <AuthCard
      title="Create a new password"
      subtitle="Use the verification code to complete the password reset for your TrackMe account."
      onBack={() => navigate('/forgot-password/verify', { state: { email } })}
    >
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 1.75 }}>
        <TextField
          size="small"
          label="Email"
          type="email"
          required
          fullWidth
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          sx={authFieldSx}
        />
        <TextField
          size="small"
          label="New password"
          type="password"
          required
          fullWidth
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          sx={authFieldSx}
        />
        <TextField
          size="small"
          label="Confirm password"
          type="password"
          required
          fullWidth
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          sx={authFieldSx}
        />

        {error ? <Alert severity="error" sx={authErrorAlertSx}>{error}</Alert> : null}

        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{
            py: 1.2,
            borderRadius: 1.5,
            background: ACCENT,
            color: '#ffffff',
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': { background: ACCENT_HOVER, boxShadow: 'none' }
          }}
        >
          {loading ? 'Updating...' : 'Reset password'}
        </Button>
      </Box>
    </AuthCard>
  );
}
