import { useOutletContext } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header';
import { AccountSettingsPanel } from '@/components/shared/account-settings-panel';

export function ManagerSettingsPage() {
  const { user, onUserUpdate } = useOutletContext();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" className="mb-0" />

      <AccountSettingsPanel user={user} onUserUpdate={onUserUpdate} />
    </div>
  );
}
