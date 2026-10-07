import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { AccountSettingsPanel } from '@/components/shared/account-settings-panel';
import { useOwnRouteQr, useSetRouteQr } from '@/hooks/use-route-qr';

const PLANNED_SECTIONS = [
  'Alert thresholds for pending requests and email digests for route changes.',
  'Fleet operating hours, default service type, timezone and locale.',
];

function QrBoardingCard({ managerId }) {
  const { routes, isLoading, isError } = useOwnRouteQr(managerId);
  const setQr = useSetRouteQr();

  const toggle = (routeId, qrEnabled) =>
    setQr.mutate(
      { routeId, qrEnabled },
      { onError: (err) => toast.error('Could not save QR boarding', { description: err?.message }) }
    );

  let body;
  if (isLoading) body = <p className="text-xs text-muted-foreground">Loading your routes...</p>;
  else if (isError) body = <p className="text-xs text-destructive">Could not load your routes.</p>;
  else if (!routes.length) body = <p className="text-xs text-muted-foreground">You have no routes of your own yet.</p>;
  else {
    body = (
      <ul className="divide-y divide-border">
        {routes.map((route) => {
          const saving = setQr.isPending && setQr.variables?.routeId === route.routeId;
          return (
            <li key={route.routeId} className="flex items-center justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{route.routeName}</p>
                <p className="text-xs text-muted-foreground">{route.routeId}</p>
              </div>
              <Switch
                checked={Boolean(route.qrEnabled)}
                disabled={saving}
                onCheckedChange={(on) => toggle(route.routeId, on)}
                aria-label={`QR boarding for ${route.routeName}`}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="text-sm font-semibold mb-1">QR boarding</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Turn on if your drivers scan riders&apos; passes when they board. Off hides scanning in the
          driver app and the pass in the passenger app.
        </p>
        {body}
      </CardContent>
    </Card>
  );
}

export function ManagerSettingsPage() {
  const { user, onUserUpdate } = useOutletContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and review upcoming organization preferences."
      />

      <AccountSettingsPanel user={user} onUserUpdate={onUserUpdate} />

      <QrBoardingCard managerId={user?._id} />

      <Card>
        <CardContent className="pt-5">
          <h3 className="text-sm font-semibold mb-2">Coming soon</h3>
          <ul className="space-y-1">
            {PLANNED_SECTIONS.map((item) => (
              <li key={item} className="text-xs text-muted-foreground">• {item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
