import { useState } from 'react';
import { Alert, Box, Button, TextField } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import { AuthCard, ACCENT, ACCENT_HOVER, authFieldSx, authErrorAlertSx } from '../components/auth/AuthCard';

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
          inputProps={{ inputMode: 'numeric', maxLength: 6 }}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
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
          {loading ? 'Verifying...' : 'Verify code'}
        </Button>
      </Box>
    </AuthCard>
  );
}
