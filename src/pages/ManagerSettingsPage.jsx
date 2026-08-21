import { useOutletContext } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { AccountSettingsPanel } from '@/components/shared/account-settings-panel';

const PLANNED_SECTIONS = [
  'Alert thresholds for pending requests and email digests for route changes.',
  'Fleet operating hours, default service type, timezone and locale.',
];

export function ManagerSettingsPage() {
  const { user, onUserUpdate } = useOutletContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and review upcoming organization preferences."
      />

      <AccountSettingsPanel user={user} onUserUpdate={onUserUpdate} />

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
