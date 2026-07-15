import { useState } from 'react';
import { Alert, Box, Button, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import { AuthCard, ACCENT, ACCENT_HOVER, authFieldSx, authErrorAlertSx } from '../components/auth/AuthCard';

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
    <AuthCard
      title="Reset your password"
      subtitle="Enter the email address linked to your TrackMe account and we'll send a recovery code."
      onBack={() => navigate('/login')}
      backLabel="Back to sign in"
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
          {loading ? 'Sending...' : 'Send recovery code'}
        </Button>
      </Box>
    </AuthCard>
  );
}
