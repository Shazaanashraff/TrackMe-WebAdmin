import { useEffect, useState } from 'react';
import { Alert, Box, Button } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminApi } from '../api';
import { AuthCard, ACCENT, ACCENT_HOVER, authErrorAlertSx, authWarningAlertSx } from '../components/auth/AuthCard';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/shared/password-input';

// Consumes the invite/reset link a manager gets emailed (see backend
// buildSetupLink: `${ADMIN_APP_URL}/activate?token=...`). Validates the token to
// find out who it belongs to and whether this is a first-time invite or a
// password reset, then lets them set a password via account-setup/complete.
export function ActivateAccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('INVITE');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const mismatch = confirmTouched && confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setChecking(false);
      return;
    }

    adminApi.validateAccountSetup(token)
      .then((result) => {
        if (cancelled) return;
        setTokenValid(true);
        setEmail(result?.email || '');
        setPurpose(result?.purpose || 'INVITE');
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(requestError.message || 'This link is invalid or has expired.');
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token || (!checking && !tokenValid)) {
    return (
      <AuthCard
        title="Link invalid"
        subtitle="This activation or reset link is missing, invalid, or has expired."
        onBack={() => navigate('/login')}
        backLabel="Back to sign in"
      >
        <Alert severity="warning" sx={authWarningAlertSx}>
          {error || 'Ask your super admin to resend the invite or reset link.'}
        </Alert>
      </AuthCard>
    );
  }

  if (checking) {
    return (
      <AuthCard title="Checking your link…" subtitle="One moment.">
        <span />
      </AuthCard>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setConfirmTouched(true);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await adminApi.completeAccountSetup(token, password);
      navigate('/login', {
        replace: true,
        state: { passwordResetSuccess: true }
      });
    } catch (requestError) {
      setError(requestError.message || 'Unable to set password');
    } finally {
      setSubmitting(false);
    }
  };

  const isInvite = purpose === 'INVITE';

  return (
    <AuthCard
      title={isInvite ? 'Activate your account' : 'Reset your password'}
      subtitle={
        isInvite
          ? `Set a password for ${email} to finish activating your TrackMe manager account.`
          : `Choose a new password for ${email}.`
      }
    >
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 1.75 }}>
        <Box sx={{ display: 'grid', gap: 0.5 }}>
          <Label htmlFor="activate-password" className="text-[#F7F5EF]">New password</Label>
          <PasswordInput
            id="activate-password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Box>
        <Box sx={{ display: 'grid', gap: 0.5 }}>
          <Label htmlFor="activate-confirm-password" className="text-[#F7F5EF]">Confirm password</Label>
          <PasswordInput
            id="activate-confirm-password"
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
          disabled={submitting}
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
          {submitting ? 'Saving...' : isInvite ? 'Activate account' : 'Reset password'}
        </Button>
      </Box>
    </AuthCard>
  );
}
