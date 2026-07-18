import { useEffect, useState } from 'react';
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

export function ManagerAccountsPage() {
  const [selectedBusId, setSelectedBusId] = useState('');
  const [password, setPassword] = useState('');
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
    if (!password.trim()) { setFormError('New password is required.'); return; }
    if (password.length < 8) { setFormError('Password must be at least 8 characters.'); return; }

    try {
      await resetM.mutateAsync({ busId: selectedBusId, payload: { password } });
      setPassword('');
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
                <div className="space-y-1.5">
                  <Label htmlFor="acc-pw">New Password</Label>
                  <Input
                    id="acc-pw"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                  />
                </div>
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
