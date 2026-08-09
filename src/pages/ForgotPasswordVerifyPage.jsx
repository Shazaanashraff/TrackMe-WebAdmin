import { useEffect, useState } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import { AuthCard, ACCENT, ACCENT_HOVER, authFieldSx, authErrorAlertSx } from '../components/auth/AuthCard';
import { readForgotPasswordState, saveForgotPasswordState } from '../lib/forgotPasswordSession';

// Client-side pacing only, well under the backend's 10-minute/3-attempt cap
// (authRoutes.js) — this just stops an impatient double-click, not abuse.
const RESEND_COOLDOWN_SECONDS = 30;

export function ForgotPasswordVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = location.state?.email || readForgotPasswordState()?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await adminApi.verifyPasswordResetOtp(email, otp);
      saveForgotPasswordState({ email, resetToken: response.resetToken });
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

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage('');
    setError('');

    try {
      await adminApi.requestPasswordResetOtp(email);
      setResendMessage('A new code has been sent to your email.');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (requestError) {
      setError(requestError.message || 'Unable to resend the code');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthCard
      title="Verify the code"
      subtitle="Enter the 6-digit code sent to your email, then create a new password."
      onBack={() => navigate('/forgot-password', { state: { email } })}
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
          label="Recovery code"
          type="text"
          required
          fullWidth
          helperText="6 digits, numbers only"
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
          sx={authFieldSx}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: -1 }}>
          <Typography sx={{ color: 'rgba(247,245,239,0.5)', fontSize: '0.75rem' }}>
            Code expires in 10 minutes.
          </Typography>
          <Button
            type="button"
            variant="text"
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0 || !email}
            sx={{ textTransform: 'none', color: ACCENT, p: 0, minWidth: 0, fontSize: '0.8rem' }}
          >
            {resendCooldown > 0
              ? `Resend code (${resendCooldown}s)`
              : (resendLoading ? 'Sending…' : 'Resend code')}
          </Button>
        </Box>

        {resendMessage ? (
          <Typography sx={{ color: 'rgba(247,245,239,0.7)', fontSize: '0.8rem' }}>
            {resendMessage}
          </Typography>
        ) : null}

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
          {loading ? 'Verifying...' : 'Verify code'}
        </Button>
      </Box>
    </AuthCard>
  );
}
