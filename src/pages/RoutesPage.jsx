import { useMemo, useState } from 'react';
import { Plus, Trash2, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { AsyncSection } from '@/components/shared/async-section';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useSystemRoutes, useCreateSystemRoute } from '@/hooks/use-system-routes';
import { useManagers } from '@/hooks/use-managers';
import { SERVICE_TYPES } from '@/lib/serviceTypes';

const UNASSIGNED = '__unassigned__';

const PROVINCES = [
  { name: 'Western', slug: 'western' },
  { name: 'Central', slug: 'central' },
  { name: 'Southern', slug: 'southern' },
  { name: 'North Western', slug: 'northwestern' },
  { name: 'North Central', slug: 'northcentral' },
  { name: 'Sabaragamuwa', slug: 'sabaragamuwa' },
  { name: 'Uva', slug: 'uva' },
  { name: 'Eastern', slug: 'eastern' },
  { name: 'Northern', slug: 'northern' },
];

const EMPTY_FORM = {
  routeId: '',
  routeName: '',
  source: '',
  destination: '',
  distance: '',
  fare: '',
  serviceType: 'PUBLIC',
  qrEnabled: false,
  stops: [],
};

// Stops keyed by their stable clientId (not array position), so a reorder never
// misattaches an invalid-field highlight to the wrong row.
function getInvalidStopIds(stops) {
  const filledStops = stops.filter(
    (s) => s.stopName.trim() || String(s.lat).trim() || String(s.lng).trim(),
  );
  return filledStops
    .filter((s) => (
      !s.stopName.trim()
      || String(s.lat).trim() === ''
      || String(s.lng).trim() === ''
      || Number.isNaN(Number(s.lat))
      || Number.isNaN(Number(s.lng))
    ))
    .map((s) => s.clientId);
}

function validateForm(form) {
  if (!form.routeId.trim()) return 'Route ID is required.';
  if (!form.routeName.trim()) return 'Route Name is required.';
  if (!form.source.trim()) return 'Source is required.';
  if (!form.destination.trim()) return 'Destination is required.';
  if (!form.distance || Number.isNaN(Number(form.distance)) || Number(form.distance) <= 0) return 'Distance must be a positive number.';
  if (!form.fare || Number.isNaN(Number(form.fare)) || Number(form.fare) <= 0) return 'Fare must be a positive number.';

  const filledStops = form.stops.filter(
    (s) => s.stopName.trim() || String(s.lat).trim() || String(s.lng).trim(),
  );
  for (const stop of filledStops) {
    if (!stop.stopName.trim() || String(stop.lat).trim() === '' || String(stop.lng).trim() === '') {
      return 'Each stop must have a name, latitude, and longitude.';
    }
    if (Number.isNaN(Number(stop.lat)) || Number.isNaN(Number(stop.lng))) {
      return 'Stop coordinates must be valid numbers.';
    }
  }
  return null;
}

let nextStopClientId = 0;
const makeEmptyStop = () => ({ clientId: `stop-${nextStopClientId++}`, stopName: '', lat: '', lng: '' });

const routeColumns = [
  { id: 'routeId', header: 'Route ID', accessorKey: 'routeId' },
  { id: 'routeName', header: 'Route Name', accessorKey: 'routeName', cell: (i) => <span className="font-medium">{i.getValue()}</span> },
  { id: 'source', header: 'From', accessorKey: 'source' },
  { id: 'destination', header: 'To', accessorKey: 'destination' },
  { id: 'serviceType', header: 'Service', accessorKey: 'serviceType', cell: (i) => <Badge variant="secondary">{i.getValue()}</Badge> },
  { id: 'qrEnabled', header: 'QR', accessorKey: 'qrEnabled', cell: (i) => (i.getValue() ? <Badge>On</Badge> : <Badge variant="outline">Off</Badge>) },
  { id: 'stops', header: 'Stops', accessorKey: 'stopsCount', cell: (i) => i.getValue() ?? 0 },
  { id: 'status', header: 'Status', accessorKey: 'isActive', cell: (i) => <StatusBadge status={i.getValue() !== false ? 'active' : 'inactive'} /> },
];

export function RoutesPage() {
  const routesQ = useSystemRoutes();
  const createM = useCreateSystemRoute();
  // getManagers doesn't support a serviceType filter server-side, so fetch the
  // full page (well under the backend's 100 cap — one manager per province) and
  // filter PUBLIC managers by province client-side.
  const managersQ = useManagers({ limit: 100 });

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [invalidStopIds, setInvalidStopIds] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(null);

  const routes = routesQ.data?.data || [];
  const managers = managersQ.data?.data || [];

  const managerEmailByProvince = useMemo(() => {
    const map = {};
    for (const manager of managers) {
      if (manager.serviceType === 'PUBLIC' && manager.province) {
        map[manager.province] = manager.email;
      }
    }
    return map;
  }, [managers]);

  const { countsByProvince, unassignedCount } = useMemo(() => {
    const counts = {};
    let unassigned = 0;
    for (const route of routes) {
      const province = (route.province || '').trim();
      if (!province) { unassigned += 1; continue; }
      counts[province] = (counts[province] || 0) + 1;
    }
    return { countsByProvince: counts, unassignedCount: unassigned };
  }, [routes]);

  const visibleRoutes = useMemo(() => {
    if (!selectedProvince) return [];
    if (selectedProvince === UNASSIGNED) return routes.filter((r) => !(r.province || '').trim());
    return routes.filter((r) => (r.province || '').trim() === selectedProvince);
  }, [routes, selectedProvince]);

  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const addStop = () => setForm((p) => ({ ...p, stops: [...p.stops, makeEmptyStop()] }));
  const removeStop = (i) => setForm((p) => ({ ...p, stops: p.stops.filter((_, idx) => idx !== i) }));
  const updateStop = (i, key, value) =>
    setForm((p) => ({ ...p, stops: p.stops.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)) }));
  const moveStop = (i, dir) =>
    setForm((p) => {
      const stops = [...p.stops];
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= stops.length) return p;
      [stops[i], stops[j]] = [stops[j], stops[i]];
      return { ...p, stops };
    });

  const handleCreate = async (e) => {
    e.preventDefault();
    const err = validateForm(form);
    if (err) {
      setFormError(err);
      setInvalidStopIds(getInvalidStopIds(form.stops));
      return;
    }
    setFormError(null);
    setInvalidStopIds([]);

    const filledStops = form.stops
      .filter((s) => s.stopName.trim() || String(s.lat).trim() || String(s.lng).trim())
      .map((s, idx) => ({ stopName: s.stopName.trim(), order: idx + 1, lat: Number(s.lat), lng: Number(s.lng) }));

    try {
      await createM.mutateAsync({
        routeId: form.routeId.trim(),
        routeName: form.routeName.trim(),
        source: form.source.trim(),
        destination: form.destination.trim(),
        distance: Number(form.distance),
        fare: Number(form.fare),
        serviceType: form.serviceType,
        qrEnabled: form.qrEnabled,
        stops: filledStops,
        stopsCount: filledStops.length,
      });
      toast('Route created successfully');
      setForm(EMPTY_FORM);
      setInvalidStopIds([]);
    } catch (err) {
      setFormError(err?.message || 'Failed to create route');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Route Management"
        description="Create system routes and browse assignments by province manager."
      />

      {/* Create route form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Route</CardTitle>
          <CardDescription>Stops are optional and can be added, reordered, or removed before saving.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="route-id">Route ID</Label>
                <Input id="route-id" value={form.routeId} onChange={setField('routeId')} placeholder="e.g. RT-001" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="route-name">Route Name</Label>
                <Input id="route-name" value={form.routeName} onChange={setField('routeName')} placeholder="e.g. Colombo–Kandy Express" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="route-source">Source</Label>
                <Input id="route-source" value={form.source} onChange={setField('source')} placeholder="City or terminal" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="route-dest">Destination</Label>
                <Input id="route-dest" value={form.destination} onChange={setField('destination')} placeholder="City or terminal" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="route-dist">Distance (km)</Label>
                <Input id="route-dist" type="number" min="0.1" step="0.1" value={form.distance} onChange={setField('distance')} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="route-fare">Fare (LKR)</Label>
                <Input id="route-fare" type="number" min="1" step="1" value={form.fare} onChange={setField('fare')} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="route-service">Service Type</Label>
                <Select value={form.serviceType} onValueChange={(v) => setForm((p) => ({ ...p, serviceType: v }))}>
                  <SelectTrigger id="route-service">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="route-qr">QR Attendance</Label>
                <div className="flex items-center h-9 gap-2">
                  <Switch
                    id="route-qr"
                    checked={form.qrEnabled}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, qrEnabled: v }))}
                    aria-label="Enable QR attendance for this route"
                  />
                  <span className="text-sm text-muted-foreground">{form.qrEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>

            {/* Stops section */}
            <div className="rounded-xl border border-border bg-surface-muted p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Stops (Optional)</span>
                <Button type="button" size="sm" variant="outline" onClick={addStop}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Stop
                </Button>
              </div>

              {form.stops.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stops added. Stops are optional.</p>
              ) : (
                <div className="space-y-2">
                  {form.stops.map((stop, i) => {
                    const stopInvalid = invalidStopIds.includes(stop.clientId);
                    return (
                    <div key={stop.clientId} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-5">
                        <Input
                          aria-label={`Stop ${i + 1} name`}
                          aria-invalid={stopInvalid}
                          placeholder={`Stop ${i + 1} name`}
                          value={stop.stopName}
                          onChange={(e) => updateStop(i, 'stopName', e.target.value)}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Input
                          aria-label={`Stop ${i + 1} latitude`}
                          aria-invalid={stopInvalid}
                          type="number"
                          placeholder="Lat"
                          value={stop.lat}
                          onChange={(e) => updateStop(i, 'lat', e.target.value)}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Input
                          aria-label={`Stop ${i + 1} longitude`}
                          aria-invalid={stopInvalid}
                          type="number"
                          placeholder="Lng"
                          value={stop.lng}
                          onChange={(e) => updateStop(i, 'lng', e.target.value)}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-3 flex gap-1 justify-end">
                        <Button type="button" size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => moveStop(i, 'up')}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" aria-label="Move down" disabled={i === form.stops.length - 1} onClick={() => moveStop(i, 'down')}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" aria-label="Remove stop" onClick={() => removeStop(i)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button type="submit" disabled={createM.isPending}>
              {createM.isPending ? 'Creating…' : 'Create Route'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Province drill-down or list */}
      {selectedProvince ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">
                {selectedProvince === UNASSIGNED ? 'Unassigned Routes' : `${selectedProvince} Province`}
              </CardTitle>
              {selectedProvince !== UNASSIGNED && (
                <CardDescription>{managerEmailByProvince[selectedProvince] || 'No manager assigned'}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{visibleRoutes.length} routes</Badge>
              <Button size="sm" variant="outline" onClick={() => setSelectedProvince(null)}>← All provinces</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <AsyncSection isLoading={routesQ.isLoading} error={routesQ.error} data={visibleRoutes} isEmpty={false} onRetry={routesQ.refetch}>
              <DataTable
                columns={routeColumns}
                data={visibleRoutes}
                emptyTitle="No routes for this province"
              />
            </AsyncSection>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Routes by Province Manager</CardTitle>
              <CardDescription>Click a province to view its routes</CardDescription>
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">{routes.length} routes total</span>
          </CardHeader>
          <CardContent className="pt-0">
            <AsyncSection isLoading={routesQ.isLoading} error={routesQ.error} data={routes} isEmpty={false} onRetry={routesQ.refetch}>
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                {PROVINCES.map((province) => {
                  const count = countsByProvince[province.name] || 0;
                  return (
                    <button
                      key={province.slug}
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted/70 transition-colors text-left"
                      onClick={() => setSelectedProvince(province.name)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">{province.name} Province</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{managerEmailByProvince[province.name] || 'No manager assigned'}</p>
                      </div>
                      <Badge variant={count > 0 ? 'default' : 'secondary'}>{count} routes</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}

                {unassignedCount > 0 && (
                  <>
                    <Separator />
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-muted/70 transition-colors text-left"
                      onClick={() => setSelectedProvince(UNASSIGNED)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">Unassigned</p>
                        <p className="text-xs text-muted-foreground mt-0.5">No province manager</p>
                      </div>
                      <Badge variant="outline">{unassignedCount} routes</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  </>
                )}
              </div>
            </AsyncSection>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
