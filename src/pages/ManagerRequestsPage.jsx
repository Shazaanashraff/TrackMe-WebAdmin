import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { StaleChip } from '@/components/shared/stale-chip';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useManagerDrivers } from '@/hooks/use-drivers';
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
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
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

// Radix Select has no empty-string value, so the unfiltered option needs a
// sentinel. It never reaches the URL: picking it clears `?driver` entirely.
const ALL_DRIVERS = 'ALL';

export function ManagerRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOnline = useOnlineStatus();

  // Both the tab and the driver filter live in the URL, so the Drivers page can
  // link straight to one driver's roster and the manager can share or reload the
  // view they are looking at. Same pattern as the tracking page's ?vehicle=.
  const requested = (searchParams.get('status') || '').toUpperCase();
  const status = isStatus(requested) ? requested : 'PENDING';
  const driverId = searchParams.get('driver') || '';

  const requestsQ = useEnrollmentRequests(status, driverId);
  const driversQ = useManagerDrivers();
  const approve = useApproveEnrollmentRequest();
  const reject = useRejectEnrollmentRequest();
  const remove = useRemoveEnrollment();

  // Holds the row awaiting confirmation plus which way it is going, so one
  // dialog serves every decision.
  const [pendingDecision, setPendingDecision] = useState(null);

  const requests = requestsQ.data?.data || [];
  const isDeciding = approve.isPending || reject.isPending || remove.isPending;

  // One picker covers both "whose students" and "which vehicle's students",
  // because they are the same question: a vehicle has one driver
  // (Vehicle.js:51) and an enrollment points at the driver, never the vehicle.
  // Each option carries the plate so it is findable either way.
  const driverOptions = useMemo(() => (driversQ.data?.data || []).map((driver) => ({
    id: String(driver._id),
    label: driver.vehicle?.numberPlate
      ? `${driver.name} · ${driver.vehicle.numberPlate}`
      : `${driver.name} · No vehicle`,
  })), [driversQ.data]);

  // A failed driver list must not take the roster down with it, so the picker
  // disables itself and the page carries on.
  const canFilter = !driversQ.isLoading && !driversQ.error && driverOptions.length > 0;

  const setStatus = (next) => {
    const params = new URLSearchParams(searchParams);
    params.set('status', next);
    setSearchParams(params, { replace: true });
  };

  const setDriver = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next === ALL_DRIVERS) params.delete('driver');
    else params.set('driver', next);
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
              disabled={isDeciding || !isOnline}
              title={isOnline ? undefined : 'Unavailable offline'}
              onClick={() => setPendingDecision({ request: row.original, action: 'reject' })}
            >
              <X className="mr-1.5 h-4 w-4" />
              Decline
            </Button>
            <Button
              size="sm"
              disabled={isDeciding || !isOnline}
              title={isOnline ? undefined : 'Unavailable offline'}
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
              disabled={isDeciding || !isOnline}
              title={isOnline ? undefined : 'Unavailable offline'}
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
  }, [isDeciding, status, isOnline]);

  // Below md the 8-column queue renders a card per row. Nothing is dropped:
  // there is no row-detail view, so the organization answers a rider gave at
  // enrollment exist nowhere else in the portal.
  const renderMobileCard = (request) => {
    const passenger = request.passenger;
    const managed = passenger?.isManagedProfile
      ? ['Managed profile', passenger.relation].filter(Boolean).join(' · ')
      : '';
    const email = passenger?.email || passenger?.account?.email;
    const phone = passenger?.account?.phoneNumber;
    const details = organizationDetails(passenger);
    const when = status === 'PENDING'
      ? formatWhen(request.requestedAt)
      : formatWhen(request.decidedAt || request.requestedAt);

    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium truncate">{passenger?.name || 'Unknown'}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{when}</span>
        </div>

        {/* Identity on one line rather than two: the rider code and the
            managed-profile note are the same fact about who this is. */}
        {(passenger?.riderCode || managed) && (
          <p className="text-xs text-muted-foreground">
            {passenger?.riderCode && <span className="font-mono">{passenger.riderCode}</span>}
            {passenger?.riderCode && managed && <span> · </span>}
            {managed}
          </p>
        )}

        {(email || phone) && (
          <p className="text-xs break-words">
            {email}
            {email && phone && <span className="text-muted-foreground"> · </span>}
            {phone && <span className="text-muted-foreground tabular-nums">{phone}</span>}
          </p>
        )}

        <p className="text-xs">
          <span className="text-muted-foreground">Driver: </span>
          {request.driver?.name || 'Unknown'}
          {request.driver?.driverCode && (
            <span className="font-mono text-muted-foreground"> · {request.driver.driverCode}</span>
          )}
        </p>

        {/* Inline, not a label/value row. justify-between stranded a short
            answer at the far edge with nothing between it and its label
            ("Grade" hard left, "7" hard right), which read as two unrelated
            things rather than one answer. */}
        {details.length > 0 && (
          <dl className="space-y-0.5 text-xs">
            {details.map((detail) => (
              <div key={detail.key} className="break-words">
                <dt className="inline text-muted-foreground">{detail.label}: </dt>
                <dd className="inline">{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {status === 'PENDING' && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={isDeciding || !isOnline}
              title={isOnline ? undefined : 'Unavailable offline'}
              onClick={() => setPendingDecision({ request, action: 'reject' })}
            >
              <X className="mr-1.5 h-4 w-4" />
              Decline
            </Button>
            <Button
              size="sm"
              disabled={isDeciding || !isOnline}
              title={isOnline ? undefined : 'Unavailable offline'}
              onClick={() => setPendingDecision({ request, action: 'approve' })}
            >
              <Check className="mr-1.5 h-4 w-4" />
              Approve
            </Button>
          </div>
        )}

        {status === 'ACTIVE' && (
          <div className="flex pt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={isDeciding || !isOnline}
              title={isOnline ? undefined : 'Unavailable offline'}
              onClick={() => setPendingDecision({ request, action: 'remove' })}
            >
              <UserMinus className="mr-1.5 h-4 w-4" />
              Remove
            </Button>
          </div>
        )}
      </div>
    );
  };

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
      <PageHeader title="Enrollments" description={DESCRIPTION[status]} />

      {/* The picker states what is filtered and clears it, so the old
          "Showing one driver: X" caption and "Show all drivers" button are
          gone rather than saying the same thing a third time. The filter is
          URL state, so it survives a tab switch, a reload and a share, and the
          Drivers page's deep link arrives with it already selected. */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Select
          value={driverId || ALL_DRIVERS}
          onValueChange={setDriver}
          disabled={!canFilter}
        >
          <SelectTrigger
            aria-label="Filter by driver or vehicle"
            className="w-full sm:w-64"
          >
            <SelectValue placeholder="All drivers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_DRIVERS}>All drivers</SelectItem>
            {driverOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* self-start so the chip keeps its natural width: the row is a flex
            column at base, where children stretch by default and a pill
            spanning the full width reads as a banner. */}
        {requests.length > 0 && (
          <div className="self-start">
            <StaleChip
              updatedAt={requestsQ.dataUpdatedAt}
              offline={!isOnline}
              loud={status === 'PENDING'}
              label={status === 'PENDING' ? 'Queue as of' : 'Updated'}
            />
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={status} onValueChange={setStatus} className="min-w-0 max-w-full">
          <TabsList className="max-w-full overflow-x-auto">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {status === 'PENDING' && !isOnline && requests.length > 0 && (
        <p className="mb-4 rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-sm text-status-warning">
          Offline — this queue may have changed since it was last loaded. Approve and
          decline are disabled until you reconnect.
        </p>
      )}

      <DataTable
        columns={columns}
        data={requests}
        isLoading={requestsQ.isLoading}
        error={requestsQ.error}
        onRetry={requestsQ.refetch}
        emptyTitle={EMPTY_STATE[status].title}
        emptyDescription={EMPTY_STATE[status].description}
        renderMobileCard={renderMobileCard}
      />

      <ConfirmDialog
        open={Boolean(pendingDecision)}
        onOpenChange={(open) => { if (!open) setPendingDecision(null); }}
        title={dialogCopy.title}
        description={dialogCopy.description}
        confirmLabel={dialogCopy.confirmLabel}
        destructive={dialogCopy.destructive}
        pending={isDeciding}
        confirmDisabled={!isOnline}
        onConfirm={runDecision}
      />
    </>
  );
}
