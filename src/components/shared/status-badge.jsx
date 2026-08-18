import { Badge } from '@/components/ui/badge';

const STATUS_MAP = {
  // vehicle
  online: { variant: 'settled', label: 'Online' },
  idle: { variant: 'progress', label: 'Idle' },
  offline: { variant: 'danger', label: 'Offline' },
  // requests / approvals
  pending: { variant: 'pending', label: 'Pending' },
  approved: { variant: 'settled', label: 'Approved' },
  rejected: { variant: 'danger', label: 'Rejected' },
  // manager accounts
  active: { variant: 'settled', label: 'Active' },
  suspended: { variant: 'danger', label: 'Suspended' },
  // deliberate deactivation (distinct from a vehicle that's simply not
  // currently connected — the backend only exposes isActive, not a live
  // connection signal, so this reads the deactivation flag honestly instead
  // of mislabeling it as "Offline")
  deactivated: { variant: 'secondary', label: 'Deactivated' },
  // route privacy
  public: { variant: 'progress', label: 'Public' },
  private: { variant: 'pending', label: 'Private' },
  // GPS signal
  fresh: { variant: 'settled', label: 'GPS Live' },
  stale: { variant: 'warning', label: 'GPS Stale' },
  // payment settlement
  settled: { variant: 'settled', label: 'Settled' },
  'in-progress': { variant: 'progress', label: 'In Progress' },
};

export function StatusBadge({ status, label }) {
  const key = String(status ?? '').toLowerCase().replace(/_/g, '-');
  const entry = STATUS_MAP[key];
  if (!entry) {
    return <Badge variant="secondary">{label ?? status}</Badge>;
  }
  return <Badge variant={entry.variant}>{label ?? entry.label}</Badge>;
}

export { STATUS_MAP };
