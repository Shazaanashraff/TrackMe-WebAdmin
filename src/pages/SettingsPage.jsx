import { useOutletContext } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { AccountSettingsPanel } from '@/components/shared/account-settings-panel';

const PLANNED_SECTIONS = [
  'Enforce password rotation and optional MFA for privileged admin accounts.',
  'Operations alerts (vehicle rating drops, cancellation-rate thresholds, maintenance escalations).',
  'Audit logging governance and data retention policy.',
];

export function SettingsPage() {
  const { user, onUserUpdate } = useOutletContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and review upcoming workspace guardrails."
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
