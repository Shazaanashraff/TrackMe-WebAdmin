import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useManagerBuses } from '@/hooks/use-buses';
import { useResetBusAccountPassword } from '@/hooks/use-buses';

function PasswordField({ id, label, value, onChange, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false);
  const toggleVisibility = () => setVisible((v) => !v);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="pr-9"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleVisibility}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-0 top-0 h-9 w-9 text-muted-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </Button>
      </div>
    </div>
  );
}

export function ManagerAccountsPage() {
  const [selectedBusId, setSelectedBusId] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState(null);

  const busesQ = useManagerBuses();
  const resetM = useResetBusAccountPassword();

  const buses = busesQ.data?.data || [];

  // Auto-select first bus
  useEffect(() => {
    if (buses.length > 0 && !selectedBusId) {
      setSelectedBusId(buses[0].busId);
    }
  }, [buses, selectedBusId]);

  const selectedBus = buses.find((b) => b.busId === selectedBusId);

  const handleReset = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedBusId) { setFormError('Please select a bus.'); return; }
    if (!oldPassword.trim()) { setFormError('Old password is required.'); return; }
    if (!newPassword.trim()) { setFormError('New password is required.'); return; }
    if (newPassword.length < 8) { setFormError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setFormError('New password and confirmation do not match.'); return; }

    try {
      await resetM.mutateAsync({ busId: selectedBusId, payload: { oldPassword, password: newPassword } });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast('Bus account password updated successfully');
    } catch (err) {
      setFormError(err?.message || 'Failed to update password');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Management"
        description="Rotate bus account credentials securely when driver assignments change."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Managed Buses" value={buses.length} isLoading={busesQ.isLoading} />
        <StatCard label="Selected Bus" value={selectedBusId || 'None'} isLoading={busesQ.isLoading} />
        <StatCard label="Password Policy" value="Min 8 chars" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Reset form */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reset Bus Account Password</CardTitle>
              <CardDescription>
                Select a bus account and set a new credential for the assigned operator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleReset} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-bus">Bus</Label>
                  <Select value={selectedBusId} onValueChange={setSelectedBusId}>
                    <SelectTrigger id="acc-bus">
                      <SelectValue placeholder="Select a bus" />
                    </SelectTrigger>
                    <SelectContent>
                      {buses.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No buses found</div>
                      ) : (
                        buses.map((bus) => (
                          <SelectItem key={bus._id || bus.busId} value={bus.busId}>
                            {bus.busName} ({bus.busId})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <PasswordField
                  id="acc-pw-old"
                  label="Old Password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                />
                <PasswordField
                  id="acc-pw-new"
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                />
                <PasswordField
                  id="acc-pw-confirm"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />
                <Button type="submit" disabled={resetM.isPending}>
                  {resetM.isPending ? 'Updating…' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Context panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Selected Account Context</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                {[
                  { label: 'Bus', value: selectedBus?.busName || 'Not selected' },
                  { label: 'Bus ID', value: selectedBusId || 'N/A' },
                  { label: 'Number Plate', value: selectedBus?.numberPlate || 'N/A' },
                  { label: 'Route', value: selectedBus?.routeId || 'N/A' },
                  { label: 'Driver Email', value: selectedBus?.driverId?.email || 'N/A' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-1.5">
                    <dt className="font-semibold shrink-0">{label}:</dt>
                    <dd className="text-muted-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-muted-foreground mt-4">
                Tip: update this password immediately when a driver handover happens.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
