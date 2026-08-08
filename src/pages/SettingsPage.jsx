import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const PLANNED_SECTIONS = [
  {
    title: 'Access & Security',
    items: [
      'Enforce password rotation every 90 days for managers.',
      'Configure optional MFA for privileged admin accounts.',
      'Set automatic session expiry with activity-based renewal.',
    ],
  },
  {
    title: 'Operations Alerts',
    items: [
      'Trigger alerts when any vehicle rating drops below 3.5.',
      'Notify super admin when manager cancellation rate exceeds threshold.',
      'Raise maintenance escalations for vehicles inactive > 48 hours.',
    ],
  },
  {
    title: 'Governance',
    items: [
      'Enable audit logging for manager CRUD and status changes.',
      'Publish monthly manager performance snapshots automatically.',
      'Define data retention for booking and review histories.',
    ],
  },
];

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure security and operational guardrails for your admin workspace."
      />

      <Alert>
        <AlertDescription>
          Settings configuration is under development. The items below reflect planned capabilities for this platform.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PLANNED_SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-0">
              {section.items.map((item, i) => (
                <div key={item}>
                  {i > 0 && <Separator className="my-3" />}
                  <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
