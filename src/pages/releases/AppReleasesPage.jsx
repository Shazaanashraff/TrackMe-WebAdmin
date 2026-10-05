import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { AsyncSection } from '@/components/shared/async-section';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useAppReleaseHistory, useCreateAppRelease, useUpdateAppReleaseStatus,
} from '@/hooks/use-app-releases';

const APPS = [
  { value: 'driver', label: 'Driver app' },
  { value: 'rider', label: 'Rider app' },
];

const PLATFORMS = [
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
];

const EMPTY_FORM = {
  platform: 'android',
  version: '',
  versionCode: '',
  downloadUrl: '',
  releaseNotes: '',
  mandatory: false,
};

function validateForm(form) {
  if (!form.version.trim()) return 'Version is required.';
  if (!form.versionCode || Number.isNaN(Number(form.versionCode)) || Number(form.versionCode) <= 0) {
    return 'Version code must be a positive number.';
  }
  if (!form.downloadUrl.trim()) return 'Download URL is required.';
  return null;
}

function buildReleaseColumns({ onToggleStatus, togglingId }) {
  return [
    { id: 'version', header: 'Version', accessorKey: 'version' },
    { id: 'platform', header: 'Platform', accessorKey: 'platform' },
    { id: 'versionCode', header: 'Version Code', accessorKey: 'versionCode' },
    {
      id: 'createdAt',
      header: 'Registered',
      accessorKey: 'createdAt',
      cell: (i) => {
        const value = i.getValue();
        return value ? new Date(value).toLocaleString() : '—';
      },
    },
    {
      id: 'mandatory',
      header: 'Mandatory',
      accessorKey: 'mandatory',
      cell: (i) => (i.getValue() ? <Badge variant="pending">Mandatory</Badge> : <Badge variant="secondary">Optional</Badge>),
    },
    { id: 'status', header: 'Status', accessorKey: 'isActive', cell: (i) => <StatusBadge status={i.getValue() ? 'active' : 'deactivated'} /> },
    {
      id: 'actions',
      header: '',
      accessorKey: '_id',
      enableSorting: false,
      cell: (info) => {
        const release = info.row.original;
        const toggling = togglingId === release._id;
        return (
          <Button
            size="sm"
            variant={release.isActive ? 'destructive' : 'secondary'}
            disabled={toggling}
            onClick={() => onToggleStatus(release)}
          >
            {release.isActive ? 'Retract' : 'Reactivate'}
          </Button>
        );
      },
    },
  ];
}

export function AppReleasesPage() {
  const [app, setApp] = useState('driver');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);

  const historyQ = useAppReleaseHistory(app);
  const createM = useCreateAppRelease();
  const updateM = useUpdateAppReleaseStatus();

  const releases = historyQ.data?.releases || [];

  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    const err = validateForm(form);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);

    try {
      await createM.mutateAsync({
        app,
        platform: form.platform,
        version: form.version.trim(),
        versionCode: Number(form.versionCode),
        downloadUrl: form.downloadUrl.trim(),
        releaseNotes: form.releaseNotes.trim(),
        mandatory: form.mandatory,
      });
      toast('Release registered successfully');
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err?.message || 'Failed to register release');
    }
  };

  const handleToggleStatus = async (release) => {
    try {
      await updateM.mutateAsync({ id: release._id, isActive: !release.isActive, app });
      toast(`Release ${release.isActive ? 'retracted' : 'reactivated'}`);
    } catch (err) {
      toast(err?.message || 'Failed to update release status');
    }
  };

  const releaseColumns = useMemo(() => buildReleaseColumns({
    onToggleStatus: handleToggleStatus,
    togglingId: updateM.isPending ? updateM.variables?.id : null,
  }), [updateM.isPending, updateM.variables]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Releases"
        description="Register new driver/rider app builds and manage which ones are live."
      />

      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="release-app">App</Label>
        <Select value={app} onValueChange={setApp}>
          <SelectTrigger id="release-app">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Register Release</CardTitle>
          <CardDescription>
            Download URL can be a path like <code>/downloads/driver-app-1.0.0.apk</code> for a file
            committed into <code>public/downloads/</code>, or a full URL for iOS/TestFlight.
          </CardDescription>
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
                <Label htmlFor="release-platform">Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm((p) => ({ ...p, platform: v }))}>
                  <SelectTrigger id="release-platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="release-version">Version</Label>
                <Input id="release-version" value={form.version} onChange={setField('version')} placeholder="e.g. 1.0.1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="release-version-code">Version Code</Label>
                <Input id="release-version-code" type="number" min="1" step="1" value={form.versionCode} onChange={setField('versionCode')} placeholder="0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="release-download-url">Download URL</Label>
              <Input
                id="release-download-url"
                value={form.downloadUrl}
                onChange={setField('downloadUrl')}
                placeholder="/downloads/driver-app-1.0.0.apk"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="release-notes">Release Notes</Label>
              <Textarea id="release-notes" value={form.releaseNotes} onChange={setField('releaseNotes')} placeholder="What changed in this build" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="release-mandatory">Mandatory Update</Label>
              <div className="flex items-center h-9 gap-2">
                <Switch
                  id="release-mandatory"
                  checked={form.mandatory}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, mandatory: v }))}
                  aria-label="Mark this release as a mandatory update"
                />
                <span className="text-sm text-muted-foreground">{form.mandatory ? 'Mandatory' : 'Optional'}</span>
              </div>
            </div>

            <Button type="submit" disabled={createM.isPending}>
              {createM.isPending ? 'Registering…' : 'Register Release'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Release History</CardTitle>
          <CardDescription>All registered builds for the selected app, newest first.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <AsyncSection
            isLoading={historyQ.isLoading}
            error={historyQ.error}
            data={releases}
            isEmpty={false}
            onRetry={historyQ.refetch}
          >
            <DataTable
              columns={releaseColumns}
              data={releases}
              emptyTitle="No releases registered yet"
            />
          </AsyncSection>
        </CardContent>
      </Card>
    </div>
  );
}
