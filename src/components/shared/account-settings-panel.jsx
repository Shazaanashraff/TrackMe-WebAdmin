import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUpdateOwnProfile } from '@/hooks/use-profile';
import { useOnlineStatus } from '@/hooks/use-online-status';

// Shared by SettingsPage (super-admin) and ManagerSettingsPage (manager) — the
// self-service surface issue #6 asks for is identical for both roles, just
// name-scoped account data instead of role-specific settings.
export function AccountSettingsPanel({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
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
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">
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
          </div>

          {error ? (
            <Alert variant="danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {!isOnline ? (
            <Alert variant="warning">
              <AlertDescription>You need a connection to save profile changes.</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" disabled={isUnchanged || updateProfileM.isPending || !isOnline}>
            {updateProfileM.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="text-sm font-medium">Password</span>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/forgot-password', { state: { email: user?.email || '' } })}
          >
            Change password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
