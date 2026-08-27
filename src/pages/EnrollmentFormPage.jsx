import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useBlocker, useOutletContext } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header';
import { OfflineCard } from '@/components/shared/offline-card';
import { StaleChip } from '@/components/shared/stale-chip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useEnrollmentSchema, useOrganizations, useSaveEnrollmentSchema } from '@/hooks/use-enrollment-schema';

export function EnrollmentFormPage() {
  const { user } = useOutletContext();
  const isOnline = useOnlineStatus();
  const superAdmin = user?.role === 'super-admin';
  const organizationsQ = useOrganizations(superAdmin);
  const organizations = organizationsQ.data?.data || [];
  const [organizationId, setOrganizationId] = useState('');
  const schemaQ = useEnrollmentSchema({ organizationId, superAdmin });
  const save = useSaveEnrollmentSchema({ organizationId, superAdmin });
  const [fields, setFields] = useState([]);
  // The server's copy of what's currently on screen, so an edit can be told
  // apart from a fresh load. Losing ten minutes of form-builder work to a wifi
  // blip would be a genuinely bad experience.
  const [savedSnapshot, setSavedSnapshot] = useState('[]');

  const isDirty = useMemo(() => JSON.stringify(fields) !== savedSnapshot, [fields, savedSnapshot]);

  useEffect(() => {
    if (superAdmin && !organizationId && organizations[0]?._id) setOrganizationId(organizations[0]._id);
  }, [superAdmin, organizationId, organizations]);

  useEffect(() => {
    if (schemaQ.data?.data?.fields) {
      setFields(schemaQ.data.data.fields);
      setSavedSnapshot(JSON.stringify(schemaQ.data.data.fields));
    }
  }, [schemaQ.data]);

  // Warn before a route change (useBlocker) or a tab close/reload (beforeunload)
  // drops unsaved edits.
  const blocker = useBlocker(useCallback(
    ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname,
    [isDirty],
  ));

  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const update = (key, patch) => setFields((current) => current.map((field) => field.key === key ? { ...field, ...patch } : field));
  const move = (index, direction) => setFields((current) => {
    const next = [...current];
    const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next.map((field, order) => ({ ...field, order }));
  });
  const submit = () => save.mutate(fields, {
    onSuccess: () => {
      setSavedSnapshot(JSON.stringify(fields));
      toast('Enrollment form saved');
    },
    onError: (error) => toast(error?.message || 'Could not save enrollment form'),
  });

  const config = schemaQ.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Enrollment form" description="Choose only the details your organization needs for each student or employee." />

      {superAdmin ? (
        <Card>
          <CardContent className="pt-5 max-w-xl">
            <label className="text-sm font-medium block mb-2" htmlFor="organization-select">Organization</label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger id="organization-select"><SelectValue placeholder="Select an organization" /></SelectTrigger>
              <SelectContent>{organizations.map((organization) => <SelectItem key={organization._id} value={organization._id}>{organization.name} · {organization.serviceType}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>
      ) : null}

      <Alert><AlertDescription>Full name and guardian/contact phone are always collected by TrackMe. The fields below are the organization-specific details added to that standard information.</AlertDescription></Alert>

      {schemaQ.isLoading ? <Skeleton className="h-72 w-full rounded-xl" /> : schemaQ.error && !config ? (
        !isOnline
          ? <Card><OfflineCard onRetry={schemaQ.refetch} description="You're offline and this form hasn't been saved to this browser yet. It'll load when you're back." /></Card>
          : <Alert variant="destructive"><AlertDescription>{schemaQ.error.message}</AlertDescription></Alert>
      ) : config ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>{config.organization.name}</CardTitle>
              <CardDescription>{config.organization.serviceType} · Form version {config.schemaVersion}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isDirty && <span className="rounded-full border border-status-warning/30 bg-status-warning/10 px-2 py-0.5 text-xs font-medium text-status-warning">Unsaved changes</span>}
              <StaleChip updatedAt={schemaQ.dataUpdatedAt} offline={!isOnline} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl border border-border px-4 py-3">
                <div>
                  <div className="font-medium text-sm">{field.label}</div>
                  <div className="text-xs text-muted-foreground font-mono">{field.key}</div>
                </div>
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={field.enabled} onCheckedChange={(checked) => update(field.key, { enabled: Boolean(checked), required: checked ? field.required : false })} />
                    Include
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox disabled={!field.enabled} checked={field.required} onCheckedChange={(checked) => update(field.key, { required: Boolean(checked) })} />
                    Required
                  </label>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Move ${field.label} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Move ${field.label} down`} disabled={index === fields.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {!isOnline && (
              <Alert variant="warning">
                <AlertDescription>
                  You&rsquo;re offline. Keep editing — your changes stay on screen — but saving needs a connection.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-end gap-3 pt-3">
              {isDirty && isOnline && (
                <span className="text-xs text-muted-foreground">Unsaved changes</span>
              )}
              <Button onClick={submit} disabled={save.isPending || !isOnline}>
                <Save className="mr-2 h-4 w-4" />{save.isPending ? 'Saving…' : 'Save form'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => { if (!open && blocker.state === 'blocked') blocker.reset(); }}
        title="Leave without saving?"
        description="You have unsaved changes to this enrollment form. They'll be lost if you leave now."
        confirmLabel="Leave"
        destructive
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
}
