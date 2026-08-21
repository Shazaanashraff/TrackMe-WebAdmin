import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUpdateOwnProfile } from '@/hooks/use-profile';

// Shared by SettingsPage (super-admin) and ManagerSettingsPage (manager) — the
// self-service surface issue #6 asks for is identical for both roles, just
// name-scoped account data instead of role-specific settings.
export function AccountSettingsPanel({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const updateProfileM = useUpdateOwnProfile();
  const [name, setName] = useState(user?.name || '');
  const [error, setError] = useState('');

  const trimmedName = name.trim();
  const isUnchanged = trimmedName === (user?.name || '').trim();

  const handleSaveName = async (event) => {
    event.preventDefault();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    setError('');
    try {
      const result = await updateProfileM.mutateAsync(trimmedName);
      onUserUpdate?.({ name: result?.data?.name || trimmedName });
      toast('Profile updated');
    } catch (saveError) {
      setError(saveError.message || 'Unable to update profile');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name and login email for this account.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form className="space-y-4" onSubmit={handleSaveName}>
            <div className="space-y-1.5">
              <Label htmlFor="settings-name" required>Name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-required="true"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" value={user?.email || ''} disabled readOnly />
              <p className="text-xs text-muted-foreground">
                Contact a super-admin to change your login email.
              </p>
            </div>

            {error ? (
              <Alert variant="danger">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={isUnchanged || updateProfileM.isPending}>
              {updateProfileM.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Reset your password using the same recovery flow as sign-in.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/forgot-password', { state: { email: user?.email || '' } })}
          >
            Change password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
