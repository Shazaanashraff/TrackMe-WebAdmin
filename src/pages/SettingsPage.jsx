import { PageHeader } from '@/components/shared/page-header';
import { ChangePasswordCard } from '@/components/shared/change-password-card';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your own super-admin account."
      />

      <div className="max-w-md">
        <ChangePasswordCard />
      </div>
    </div>
  );
}
