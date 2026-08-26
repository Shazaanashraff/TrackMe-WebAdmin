import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useEnrollmentRequests,
  useApproveEnrollmentRequest,
  useRejectEnrollmentRequest,
  useRemoveEnrollment,
} from '@/hooks/use-enrollment-requests';

// The queue and the roster are the same records at different points in their
// life, so they are the same screen with a status tab rather than two pages. A
// rider who redeems a NON-private driver's key is written straight to ACTIVE and
// never appears under Pending at all, which is why Enrolled has to exist: it was
// the only state of the three that nothing in the portal could show.
const TABS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Enrolled' },
  { value: 'REJECTED', label: 'Declined' },
];

const EMPTY_STATE = {
  PENDING: {
    title: 'No pending requests',
    description: 'Requests appear here when someone redeems a private driver\'s enrollment key.',
  },
  ACTIVE: {
    title: 'Nobody is enrolled yet',
    description: 'Riders appear here once they redeem a driver\'s enrollment key, or once you approve their request.',
  },
  REJECTED: {
    title: 'No declined requests',
    description: 'Requests you decline are kept here. The rider can ask again later.',
  },
};

const DESCRIPTION = {
  PENDING: 'Passengers waiting to join a private driver. They stay unenrolled until you approve.',
  ACTIVE: 'Everyone currently riding with your drivers, including riders who joined without needing approval.',
  REJECTED: 'Requests you have declined. Declining does not stop the rider asking again.',
};

const formatWhen = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

// The backend labels and orders these against the organization's own enrolment
// form. Older payloads only carry the raw `key: value` map, so that is still
// read as a fallback rather than leaving the column empty.
const organizationDetails = (passenger) => {
  if (Array.isArray(passenger?.organizationDetails)) return passenger.organizationDetails;
  return Object.entries(passenger?.organizationValues || {}).map(([key, value]) => ({ key, label: key, value }));
};

const passengerLabel = (passenger) => {
  const name = passenger?.name || 'this student';
  if (passenger?.account?.email) {
    return `${name} (account: ${passenger.account.email})`;
  }
  return name;
};

const isStatus = (value) => TABS.some((tab) => tab.value === value);

export function ManagerRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Both the tab and the driver filter live in the URL, so the Drivers page can
  // link straight to one driver's roster and the manager can share or reload the
  // view they are looking at. Same pattern as the tracking page's ?vehicle=.
  const requested = (searchParams.get('status') || '').toUpperCase();
  const status = isStatus(requested) ? requested : 'PENDING';
  const driverId = searchParams.get('driver') || '';

  const requestsQ = useEnrollmentRequests(status, driverId);
  const approve = useApproveEnrollmentRequest();
  const reject = useRejectEnrollmentRequest();
  const remove = useRemoveEnrollment();

  // Holds the row awaiting confirmation plus which way it is going, so one
  // dialog serves every decision.
  const [pendingDecision, setPendingDecision] = useState(null);

  const requests = requestsQ.data?.data || [];
  const isDeciding = approve.isPending || reject.isPending || remove.isPending;

  // Named from the rows themselves rather than a second request for the driver
  // list. An empty roster has no row to read, so the filter still announces
  // itself, just without the name.
  const filteredDriverName = driverId ? requests[0]?.driver?.name || '' : '';

  const setStatus = (next) => {
    const params = new URLSearchParams(searchParams);
    params.set('status', next);
    setSearchParams(params, { replace: true });
  };

  const clearDriver = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('driver');
    setSearchParams(params, { replace: true });
  };

  const runDecision = () => {
    if (!pendingDecision) return;
    const { request, action } = pendingDecision;
    const passenger = request.passenger?.name || 'This passenger';
    const driverName = request.driver?.name || 'the driver';

    const done = (message) => ({
      onSuccess: () => {
        toast(message);
        setPendingDecision(null);
      },
      onError: (err) => {
        toast(err?.message || 'Could not record that decision');
        setPendingDecision(null);
      },
    });

    if (action === 'approve') {
      approve.mutate(request._id, done(`${passenger} is now enrolled with ${driverName}`));
    } else if (action === 'reject') {
      reject.mutate(request._id, done(`${passenger}'s request was declined`));
    } else {
      remove.mutate(request._id, done(`${passenger} was removed from ${driverName}`));
    }
  };

  const columns = useMemo(() => {
    const base = [
      {
        id: 'passenger',
        header: 'Student / employee',
        accessorKey: 'passenger',
        enableSorting: false,
        cell: (i) => {
          const passenger = i.getValue();
          // A rider the account holder added has no contact details of their
          // own, so saying whose profile it is matters as much as the name.
          const managed = passenger?.isManagedProfile
            ? ['Managed profile', passenger.relation].filter(Boolean).join(' · ')
            : '';
          return (
            <div>
              <span className="font-medium">{passenger?.name || 'Unknown'}</span>
              {passenger?.riderCode && (
                <div className="text-xs font-mono text-muted-foreground">{passenger.riderCode}</div>
              )}
              {managed && <div className="text-xs text-muted-foreground">{managed}</div>}
            </div>
          );
        },
      },
      {
        id: 'account',
        header: 'Account',
        accessorKey: 'passenger',
        enableSorting: false,
        cell: (i) => {
          const passenger = i.getValue();
          const email = passenger?.email || passenger?.account?.email;
          const phone = passenger?.account?.phoneNumber;
          if (!email && !phone) return <span className="text-muted-foreground">None</span>;
          return (
            <div>
              {email && <div>{email}</div>}
              {phone && <div className="text-xs text-muted-foreground">{phone}</div>}
            </div>
          );
        },
      },
      {
        id: 'organizationDetails',
        header: 'Organization details',
        accessorKey: 'passenger',
        enableSorting: false,
        cell: (i) => {
          const details = organizationDetails(i.getValue());
          return details.length ? (
            <div className="space-y-0.5 text-xs">
              {details.map((detail) => (
                <div key={detail.key}><span className="text-muted-foreground">{detail.label}: </span>{detail.value}</div>
              ))}
            </div>
          ) : <span className="text-muted-foreground">None</span>;
        },
      },
      {
        id: 'driver',
        header: 'Driver',
        accessorKey: 'driver',
        enableSorting: false,
        cell: (i) => i.getValue()?.name || <span className="text-muted-foreground">Unknown</span>,
      },
      {
        id: 'driverCode',
        header: 'Driver ID',
        accessorKey: 'driver',
        enableSorting: false,
        cell: (i) => (i.getValue()?.driverCode
          ? <span className="font-mono text-xs">{i.getValue().driverCode}</span>
          : <span className="text-muted-foreground">None</span>),
      },
    ];

    // Pending rows are still waiting, so the date that matters is when they
    // asked. Once decided, it is when the decision landed.
    base.push(status === 'PENDING'
      ? {
        id: 'requestedAt',
        header: 'Requested',
        accessorKey: 'requestedAt',
        cell: (i) => formatWhen(i.getValue()),
      }
      : {
        id: 'decidedAt',
        header: status === 'ACTIVE' ? 'Enrolled' : 'Declined',
        accessorKey: 'decidedAt',
        // A rider who never needed approval has no decision to date, so this
        // falls back to when they enrolled themselves.
        cell: (i) => formatWhen(i.getValue() || i.row.original.requestedAt),
      });

    if (status === 'PENDING') {
      base.push({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isDeciding}
              onClick={() => setPendingDecision({ request: row.original, action: 'reject' })}
            >
              <X className="mr-1.5 h-4 w-4" />
              Decline
            </Button>
            <Button
              size="sm"
              disabled={isDeciding}
              onClick={() => setPendingDecision({ request: row.original, action: 'approve' })}
            >
              <Check className="mr-1.5 h-4 w-4" />
              Approve
            </Button>
          </div>
        ),
      });
    }

    if (status === 'ACTIVE') {
      base.push({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={isDeciding}
              onClick={() => setPendingDecision({ request: row.original, action: 'remove' })}
            >
              <UserMinus className="mr-1.5 h-4 w-4" />
              Remove
            </Button>
          </div>
        ),
      });
    }

    return base;
  }, [isDeciding, status]);

  const target = pendingDecision?.request;
  const action = pendingDecision?.action;
  const targetDriver = target?.driver?.name || 'this driver';

  const dialogCopy = {
    approve: {
      title: `Approve ${passengerLabel(target?.passenger)}?`,
      description: `They will be enrolled with ${targetDriver} and can see their shuttle.`,
      confirmLabel: 'Approve',
      destructive: false,
    },
    reject: {
      title: `Decline ${passengerLabel(target?.passenger)}?`,
      description: `They will not be enrolled with ${targetDriver}, but can ask again later.`,
      confirmLabel: 'Decline',
      destructive: true,
    },
    remove: {
      title: `Remove ${passengerLabel(target?.passenger)}?`,
      description: `They will stop riding with ${targetDriver} and lose sight of the shuttle straight away. They can enrol again with the driver's key.`,
      confirmLabel: 'Remove',
      destructive: true,
    },
  }[action] || {};

  return (
    <>
      <PageHeader
        title="Enrollments"
        description={DESCRIPTION[status]}
        actions={driverId ? (
          <Button variant="outline" size="sm" onClick={clearDriver}>
            Show all drivers
          </Button>
        ) : null}
      />

      {driverId && (
        <p className="mb-4 text-sm text-muted-foreground">
          {filteredDriverName
            ? `Showing one driver: ${filteredDriverName}.`
            : 'Showing one driver.'}
        </p>
      )}

      <Tabs value={status} onValueChange={setStatus} className="mb-4">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={requests}
        isLoading={requestsQ.isLoading}
        error={requestsQ.error}
        onRetry={requestsQ.refetch}
        emptyTitle={EMPTY_STATE[status].title}
        emptyDescription={EMPTY_STATE[status].description}
      />

      <ConfirmDialog
        open={Boolean(pendingDecision)}
        onOpenChange={(open) => { if (!open) setPendingDecision(null); }}
        title={dialogCopy.title}
        description={dialogCopy.description}
        confirmLabel={dialogCopy.confirmLabel}
        destructive={dialogCopy.destructive}
        pending={isDeciding}
        onConfirm={runDecision}
      />
    </>
  );
}
