import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  useEnrollmentRequests,
  useApproveEnrollmentRequest,
  useRejectEnrollmentRequest,
} from '@/hooks/use-enrollment-requests';

const formatWhen = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

// A managed profile shares a name with nobody in particular — the decision
// moment (approve/decline, and the toast confirming it) is exactly where the
// manager needs the owning account surfaced, not just the profile's own name.
const passengerLabel = (passenger) => {
  const name = passenger?.name || 'this passenger';
  if (passenger?.isManagedProfile && passenger?.account?.email) {
    return `${name} (account: ${passenger.account.email})`;
  }
  return name;
};

export function ManagerRequestsPage() {
  const requestsQ = useEnrollmentRequests('PENDING');
  const approve = useApproveEnrollmentRequest();
  const reject = useRejectEnrollmentRequest();

  // Holds the row awaiting confirmation plus which way it is going, so one
  // dialog serves both decisions.
  const [pendingDecision, setPendingDecision] = useState(null);

  const requests = requestsQ.data?.data || [];
  const isDeciding = approve.isPending || reject.isPending;

  const runDecision = () => {
    if (!pendingDecision) return;
    const { request, approved } = pendingDecision;
    const mutation = approved ? approve : reject;
    const passenger = request.passenger?.name || 'This passenger';

    mutation.mutate(request._id, {
      onSuccess: () => {
        toast(approved
          ? `${passenger} is now enrolled with ${request.driver?.name || 'the driver'}`
          : `${passenger}'s request was declined`);
        setPendingDecision(null);
      },
      onError: (err) => {
        toast(err?.message || 'Could not record that decision');
        setPendingDecision(null);
      },
    });
  };

  const columns = useMemo(() => [
    {
      id: 'passenger',
      header: 'Passenger',
      accessorKey: 'passenger',
      enableSorting: false,
      cell: (i) => {
        const passenger = i.getValue();
        return (
          <div>
            <span className="font-medium">{passenger?.name || 'Unknown'}</span>
            {passenger?.isManagedProfile && (
              <div className="text-xs text-muted-foreground">
                Managed profile{passenger.relation ? ` · ${passenger.relation}` : ''}
              </div>
            )}
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
        // A managed profile has no email/phone of its own — the account that
        // owns it is what the manager actually needs to identify them by.
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
    {
      id: 'requestedAt',
      header: 'Requested',
      accessorKey: 'requestedAt',
      cell: (i) => formatWhen(i.getValue()),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isDeciding}
            onClick={() => setPendingDecision({ request: row.original, approved: false })}
          >
            <X className="mr-1.5 h-4 w-4" />
            Decline
          </Button>
          <Button
            size="sm"
            disabled={isDeciding}
            onClick={() => setPendingDecision({ request: row.original, approved: true })}
          >
            <Check className="mr-1.5 h-4 w-4" />
            Approve
          </Button>
        </div>
      ),
    },
  ], [isDeciding]);

  const target = pendingDecision?.request;
  const approving = pendingDecision?.approved;

  return (
    <>
      <PageHeader
        title="Enrollment requests"
        description="Passengers waiting to join a private driver. They stay unenrolled until you approve."
      />

      <DataTable
        columns={columns}
        data={requests}
        isLoading={requestsQ.isLoading}
        error={requestsQ.error}
        onRetry={requestsQ.refetch}
        emptyTitle="No pending requests"
        emptyDescription="Requests appear here when someone redeems a private driver's enrollment key."
      />

      <ConfirmDialog
        open={Boolean(pendingDecision)}
        onOpenChange={(open) => { if (!open) setPendingDecision(null); }}
        title={approving
          ? `Approve ${passengerLabel(target?.passenger)}?`
          : `Decline ${passengerLabel(target?.passenger)}?`}
        description={approving
          ? `They will be enrolled with ${target?.driver?.name || 'this driver'} and can see their shuttle.`
          : `They will not be enrolled with ${target?.driver?.name || 'this driver'}, but can ask again later.`}
        confirmLabel={approving ? 'Approve' : 'Decline'}
        destructive={!approving}
        pending={isDeciding}
        onConfirm={runDecision}
      />
    </>
  );
}
