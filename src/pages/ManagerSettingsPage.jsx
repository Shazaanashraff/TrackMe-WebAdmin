import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

const PLANNED_SECTIONS = [
  {
    title: 'Profile',
    items: ['Edit display name and contact information', 'Update avatar / profile picture', 'Change your login email'],
  },
  {
    title: 'Notifications',
    items: ['Alert thresholds for pending requests', 'Email digests for route change events', 'Push notification preferences'],
  },
  {
    title: 'Organization',
    items: ['Set fleet operating hours', 'Configure default service type', 'Timezone and locale settings'],
  },
];

export function ManagerSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Profile editing and organization-level preferences."
      />

      <Alert>
        <AlertDescription>
          Manager settings configuration is under development. The features below are planned for the next increment.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PLANNED_SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold mb-2">{section.title}</h3>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item} className="text-xs text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
