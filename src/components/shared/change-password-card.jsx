import { useState } from 'react';
import { adminApi } from '../../api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordInput } from '@/components/shared/password-input';

const PASSWORD_RULE_MESSAGE =
  'At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.';

// Self-service password change for the signed-in account (Manager or
// Super-Admin) — the one real settings capability that exists today. See
// TrackMe-WebAdmin#6.
export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const mismatch = confirmTouched && confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccess(false);
    setError('');

    if (newPassword !== confirmPassword) {
      setConfirmTouched(true);
      return;
    }

    setLoading(true);
    try {
      await adminApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setConfirmTouched(false);
      setSuccess(true);
    } catch (requestError) {
      setError(requestError.message || 'Unable to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Change password</CardTitle>
        <CardDescription>{PASSWORD_RULE_MESSAGE}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="settings-current-password" required>Current password</Label>
            <PasswordInput
              id="settings-current-password"
              autoComplete="current-password"
              required
              aria-required="true"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-new-password" required>New password</Label>
            <PasswordInput
              id="settings-new-password"
              autoComplete="new-password"
              required
              aria-required="true"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-confirm-password" required>Confirm new password</Label>
            <PasswordInput
              id="settings-confirm-password"
              autoComplete="new-password"
              required
              aria-required="true"
              aria-invalid={mismatch}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setConfirmTouched(true)}
            />
            {mismatch ? <p className="text-sm text-destructive">Passwords do not match</p> : null}
          </div>

          {error ? (
            <Alert variant="danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert>
              <AlertDescription>Password updated.</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
