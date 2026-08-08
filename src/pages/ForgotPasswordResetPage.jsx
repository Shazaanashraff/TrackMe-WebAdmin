import { useState } from 'react';
import { Alert, Box, Button, TextField } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import { AuthCard, ACCENT, ACCENT_HOVER, authFieldSx, authErrorAlertSx, authWarningAlertSx } from '../components/auth/AuthCard';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/shared/password-input';
import { readForgotPasswordState, clearForgotPasswordState } from '../lib/forgotPasswordSession';

export function ForgotPasswordResetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedFlowState = readForgotPasswordState();
  const initialEmail = location.state?.email || storedFlowState?.email || '';
  const initialResetToken = location.state?.resetToken || storedFlowState?.resetToken || '';
  const [email, setEmail] = useState(initialEmail);
  const [resetToken] = useState(initialResetToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mismatch = confirmTouched && confirmPassword.length > 0 && password !== confirmPassword;

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
      setConfirmTouched(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await adminApi.resetPasswordWithToken(email, resetToken, password);
      clearForgotPasswordState();
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
        <Box sx={{ display: 'grid', gap: 0.5 }}>
          <Label htmlFor="reset-password" className="text-[#F7F5EF]">New password</Label>
          <PasswordInput
            id="reset-password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Box>
        <Box sx={{ display: 'grid', gap: 0.5 }}>
          <Label htmlFor="reset-confirm-password" className="text-[#F7F5EF]">Confirm password</Label>
          <PasswordInput
            id="reset-confirm-password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onBlur={() => setConfirmTouched(true)}
            aria-invalid={mismatch}
          />
          {mismatch ? (
            <p className="text-[#F7C1C1] text-sm">Passwords do not match</p>
          ) : null}
        </Box>

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
