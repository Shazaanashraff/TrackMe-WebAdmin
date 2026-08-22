import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OperationsPage } from '../OperationsPage';

vi.mock('@/hooks/use-operations', () => ({
  useOperationsOverview: vi.fn(),
  useOperationManagerDetail: vi.fn(),
  usePendingVehicleRequests: vi.fn(),
  useAuditLogs: vi.fn(),
  useReviewVehicleRequest: vi.fn(),
  useUpdateVehicle: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import {
  useOperationsOverview,
  useOperationManagerDetail,
  usePendingVehicleRequests,
  useAuditLogs,
  useReviewVehicleRequest,
  useUpdateVehicle,
} from '@/hooks/use-operations';

const MGR_A = { managerId: 'm1', managerName: 'Alice Smith', isActive: true, fleet: { totalVehicles: 3 }, bookings: { totalBookings: 20 } };
const MGR_B = { managerId: 'm2', managerName: 'Bob Jones', isActive: false, fleet: { totalVehicles: 1 }, bookings: { totalBookings: 5 } };

const DETAIL_A = {
  manager: { name: 'Alice Smith', email: 'alice@co.com' },
  vehicles: [
    {
      _id: 'b1',
      vehicleName: 'Vehicle Alpha',
      serviceType: 'PUBLIC',
      isActive: true,
      bookingMetrics: { totalBookings: 15, totalRevenue: 300 },
      reviewMetrics: { averageRating: 4.5 },
    },
  ],
};

const REQ_A = {
  _id: 'r1',
  type: 'NEW_VEHICLE',
  managerId: { name: 'Alice Smith' },
  vehicleId: 'VEHICLE-001',
  createdAt: '2026-07-17T10:00:00Z',
  reason: 'Expanding fleet',
  status: 'PENDING',
};

// A CREATE_VEHICLE_ACCOUNT request as the backend actually returns it — the
// proposed vehicle's details live under payload.vehicle (see
// TrackMe-backend managerController.createManagerVehicle).
const REQ_WITH_VEHICLE_NAME = {
  ...REQ_A,
  _id: 'r2',
  vehicleId: 'VEHICLE-002',
  payload: { vehicle: { vehicleName: 'Shuttle 99', numberPlate: 'AB-1234' } },
};

const AUDIT_A = {
  _id: 'a1',
  createdAt: '2026-07-17T09:00:00Z',
  managerId: { name: 'Alice Smith' },
  action: 'VEHICLE_UPDATED',
  entityType: 'Vehicle',
  actorId: { email: 'admin@co.com' },
};

function makeMutation(overrides = {}) {
  return {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    variables: undefined,
    ...overrides,
  };
}

function defaultHooks({
  overview = [MGR_A, MGR_B],
  detail = null,
  requests = [],
  audit = [],
  loading = false,
  overviewError = null,
  reviewMut,
  updateVehicleMut,
} = {}) {
  useOperationsOverview.mockReturnValue({
    data: { data: overview },
    isLoading: loading,
    error: overviewError,
    refetch: vi.fn(),
  });
  useOperationManagerDetail.mockReturnValue({
    data: detail ? { data: detail } : undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  usePendingVehicleRequests.mockReturnValue({
    data: { data: requests },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  useAuditLogs.mockReturnValue({
    data: { data: audit },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  });
  useReviewVehicleRequest.mockReturnValue(reviewMut || makeMutation());
  useUpdateVehicle.mockReturnValue(updateVehicleMut || makeMutation());
}

function setup(opts = {}, { initialEntries } = {}) {
  defaultHooks(opts);
  const user = userEvent.setup();
  render(
    <TooltipProvider>
      <MemoryRouter initialEntries={initialEntries || ['/operations']}>
        <OperationsPage />
      </MemoryRouter>
    </TooltipProvider>,
  );
  return { user };
}

describe('OperationsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /operations/i })).toBeInTheDocument();
  });

  it('shows all four stat card labels', () => {
    setup();
    expect(screen.getByText('Total Managers')).toBeInTheDocument();
    expect(screen.getByText('Active Managers')).toBeInTheDocument();
    expect(screen.getByText('Pending Requests')).toBeInTheDocument();
    expect(screen.getByText('Audit Records')).toBeInTheDocument();
  });

  it('shows loading skeletons when fetching', () => {
    setup({ loading: true, overview: [] });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shows error banner when overview query fails', () => {
    setup({ overviewError: new Error('Network error'), overview: [] });
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('renders manager rows in the overview table', () => {
    setup();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('shows active/suspended status badges for managers, not a live-connection label (issue #14)', () => {
    setup();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
    expect(screen.queryByText('Online')).toBeNull();
    expect(screen.queryByText('Offline')).toBeNull();
  });

  // The Vehicles/Bookings columns used to sort on the raw fleet/bookings object
  // reference instead of the numeric field the cell renders, so clicking the
  // sort toggle was a silent no-op (issue #62).
  it('sorts by Vehicles using the numeric fleet count, not the object reference', async () => {
    const { user } = setup();
    const managerCellOrder = () => screen.getAllByRole('row')
      .slice(1)
      .map((row) => (row.textContent.includes('Alice Smith') ? 'Alice' : 'Bob'));

    // Alice Smith has 3 vehicles, Bob Jones has 1. Toggling sort must actually
    // reorder rows between the two clicks — with the old object-reference
    // accessor this was a no-op and the order never changed at all.
    await user.click(screen.getByRole('button', { name: /vehicles/i }));
    const afterFirstClick = managerCellOrder();

    await user.click(screen.getByRole('button', { name: /vehicles/i }));
    const afterSecondClick = managerCellOrder();

    expect(afterFirstClick).not.toEqual(afterSecondClick);
    expect([afterFirstClick, afterSecondClick]).toContainEqual(['Bob', 'Alice']);
    expect([afterFirstClick, afterSecondClick]).toContainEqual(['Alice', 'Bob']);
  });

  it('sorts by Bookings using the numeric booking count, not the object reference', async () => {
    const { user } = setup();
    const managerCellOrder = () => screen.getAllByRole('row')
      .slice(1)
      .map((row) => (row.textContent.includes('Alice Smith') ? 'Alice' : 'Bob'));

    // Alice Smith has 20 bookings, Bob Jones has 5.
    await user.click(screen.getByRole('button', { name: /bookings/i }));
    const afterFirstClick = managerCellOrder();

    await user.click(screen.getByRole('button', { name: /bookings/i }));
    const afterSecondClick = managerCellOrder();

    expect(afterFirstClick).not.toEqual(afterSecondClick);
    expect([afterFirstClick, afterSecondClick]).toContainEqual(['Bob', 'Alice']);
    expect([afterFirstClick, afterSecondClick]).toContainEqual(['Alice', 'Bob']);
  });

  it('does not auto-select a manager on load — shows the prompt state until clicked (issue #9)', () => {
    setup({ detail: DETAIL_A });
    expect(screen.getByText('No manager selected')).toBeInTheDocument();
    expect(screen.queryByText('Vehicle Alpha')).not.toBeInTheDocument();
    expect(useOperationManagerDetail).toHaveBeenCalledWith('');
  });

  it('fetches and shows detail once the viewer clicks a manager row', async () => {
    const { user } = setup({ detail: DETAIL_A });
    await user.click(screen.getByText('Alice Smith'));
    expect(useOperationManagerDetail).toHaveBeenLastCalledWith('m1');
    await waitFor(() => {
      expect(screen.getByText('Vehicle Alpha')).toBeInTheDocument();
    });
  });

  it('shows active/deactivated status badges for vehicles, not a live-connection label (issue #14)', async () => {
    const detailWithDeactivatedVehicle = {
      ...DETAIL_A,
      vehicles: [
        ...DETAIL_A.vehicles,
        {
          _id: 'b2',
          vehicleName: 'Vehicle Beta',
          serviceType: 'PUBLIC',
          isActive: false,
          bookingMetrics: { totalBookings: 0, totalRevenue: 0 },
          reviewMetrics: { averageRating: null },
        },
      ],
    };
    const { user } = setup({ detail: detailWithDeactivatedVehicle });
    await user.click(screen.getByText('Alice Smith'));
    await waitFor(() => {
      expect(screen.getByText('Vehicle Beta')).toBeInTheDocument();
    });
    // "Active" also labels Alice's manager-account status in the overview
    // table above, so there are two matches once the detail table renders.
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Deactivated')).toBeInTheDocument();
    expect(screen.queryByText('Online')).toBeNull();
    expect(screen.queryByText('Offline')).toBeNull();
  });

  it('preselects the manager passed via ?managerId= instead of requiring a click', () => {
    setup({ detail: DETAIL_A }, { initialEntries: ['/operations?managerId=m2'] });
    expect(useOperationManagerDetail).toHaveBeenCalledWith('m2');
  });

  it('re-syncs the selected manager when ?managerId= changes while already mounted (issue #65)', async () => {
    defaultHooks({ detail: DETAIL_A });
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/operations?managerId=m1']}>
          <Link to="/operations?managerId=m2">go to m2</Link>
          <OperationsPage />
        </MemoryRouter>
      </TooltipProvider>,
    );

    expect(useOperationManagerDetail).toHaveBeenCalledWith('m1');

    // Simulates clicking "View" for a different manager from the Managers page
    // while Operations is already mounted — the URL changes but the component
    // never remounts.
    await user.click(screen.getByText('go to m2'));

    await waitFor(() => {
      expect(useOperationManagerDetail).toHaveBeenLastCalledWith('m2');
    });
  });

  it('shows empty state panel when no managers exist', () => {
    setup({ overview: [] });
    expect(screen.getByText('No manager selected')).toBeInTheDocument();
  });

  it('renders pending request rows in the Vehicle Requests table', () => {
    setup({ requests: [REQ_A] });
    expect(screen.getByText('NEW_VEHICLE')).toBeInTheDocument();
    expect(screen.getByText('VEHICLE-001')).toBeInTheDocument();
    expect(screen.getByText('Expanding fleet')).toBeInTheDocument();
  });

  // Issue #63: the Vehicle column showed the raw code with no lookup against
  // the request's own payload, even when a human-readable name was right there.
  it('resolves the Vehicle column to a friendly name (code) when the request payload carries one', () => {
    setup({ requests: [REQ_WITH_VEHICLE_NAME] });
    expect(screen.getByText('Shuttle 99 (VEHICLE-002)')).toBeInTheDocument();
    expect(screen.queryByText('VEHICLE-002')).not.toBeInTheDocument();
  });

  it('shows Approve and Reject buttons for each request', () => {
    setup({ requests: [REQ_A] });
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('opens Approve ConfirmDialog without reason textarea', async () => {
    const { user } = setup({ requests: [REQ_A] });
    await user.click(screen.getByRole('button', { name: /approve/i }));
    expect(await screen.findByRole('heading', { name: /approve request/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/reason/i)).toBeNull();
  });

  it('opens Reject ConfirmDialog with reason textarea', async () => {
    const { user } = setup({ requests: [REQ_A] });
    await user.click(screen.getByRole('button', { name: /reject/i }));
    expect(await screen.findByRole('heading', { name: /reject request/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
  });

  // There is no undo or reopen path for a reviewed request anywhere in the UI
  // or the backend — the dialog must say so before the super-admin commits to
  // a misclick, since there's no way back from this screen after (issue #77).
  it('warns that an approve decision is final before it is confirmed', async () => {
    const { user } = setup({ requests: [REQ_A] });
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await screen.findByRole('heading', { name: /approve request/i });
    expect(screen.getByText(/final and cannot be reversed/i)).toBeInTheDocument();
  });

  it('warns that a reject decision is final before it is confirmed', async () => {
    const { user } = setup({ requests: [REQ_A] });
    await user.click(screen.getByRole('button', { name: /reject/i }));
    await screen.findByRole('heading', { name: /reject request/i });
    expect(screen.getByText(/final and cannot be reversed/i)).toBeInTheDocument();
  });

  it('calls reviewMutation with APPROVE decision on confirm', async () => {
    const reviewMut = makeMutation();
    const { user } = setup({ requests: [REQ_A], reviewMut });
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await screen.findByRole('heading', { name: /approve request/i });
    await user.click(screen.getByRole('button', { name: /^approve$/i }));
    expect(reviewMut.mutateAsync).toHaveBeenCalledWith({
      requestId: 'r1',
      payload: { decision: 'APPROVE', note: '' },
    });
  });

  it('calls reviewMutation with REJECT decision and reason on confirm', async () => {
    const reviewMut = makeMutation();
    const { user } = setup({ requests: [REQ_A], reviewMut });
    await user.click(screen.getByRole('button', { name: /reject/i }));
    await screen.findByRole('heading', { name: /reject request/i });
    await user.type(screen.getByLabelText(/reason/i), 'Not compliant');
    await user.click(screen.getByRole('button', { name: /^reject$/i }));
    expect(reviewMut.mutateAsync).toHaveBeenCalledWith({
      requestId: 'r1',
      payload: { decision: 'REJECT', note: 'Not compliant' },
    });
  });

  it('keeps the dialog open with the typed reason preserved when a rejection submission fails (issue #45)', async () => {
    const reviewMut = makeMutation({ mutateAsync: vi.fn().mockRejectedValue(new Error('Network error')) });
    const { user } = setup({ requests: [REQ_A], reviewMut });
    await user.click(screen.getByRole('button', { name: /reject/i }));
    await screen.findByRole('heading', { name: /reject request/i });
    await user.type(screen.getByLabelText(/reason/i), 'Not compliant');
    await user.click(screen.getByRole('button', { name: /^reject$/i }));

    await waitFor(() => expect(reviewMut.mutateAsync).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: /reject request/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toHaveValue('Not compliant');
  });

  it('caps the rejection reason at 500 characters with inline character feedback (issue #69)', async () => {
    const { user } = setup({ requests: [REQ_A] });
    await user.click(screen.getByRole('button', { name: /reject/i }));
    await screen.findByRole('heading', { name: /reject request/i });
    const textarea = screen.getByLabelText(/reason/i);
    expect(textarea).toHaveAttribute('maxlength', '500');
    await user.type(textarea, 'Not compliant');
    expect(screen.getByText('13/500')).toBeInTheDocument();
  });

  it('shows empty state when no requests exist', () => {
    setup({ requests: [] });
    expect(screen.getByText('No requests')).toBeInTheDocument();
  });

  it('renders audit log rows', () => {
    setup({ audit: [AUDIT_A] });
    expect(screen.getByText('VEHICLE_UPDATED')).toBeInTheDocument();
    expect(screen.getByText('Vehicle')).toBeInTheDocument();
    expect(screen.getByText('admin@co.com')).toBeInTheDocument();
  });

  // Issue #12: the audit log used to hard-cap at 60 entries with no way to
  // reach older ones. useAuditLogs's `limit` is now a re-fetchable value, not
  // a fixed constant — a full page (data.length === limit) is the server's
  // way of saying "there may be more", so that's what gates the button.
  function auditRows(count, overrides = {}) {
    return Array.from({ length: count }, (_, i) => ({ ...AUDIT_A, _id: `a${i}`, ...overrides }));
  }

  it('shows a "Load older activity" button when a full page of 60 audit rows comes back', () => {
    setup({ audit: auditRows(60) });
    expect(screen.getByRole('button', { name: /load older activity/i })).toBeInTheDocument();
  });

  it('does not show "Load older activity" when fewer rows than the limit come back (no more to load)', () => {
    setup({ audit: auditRows(12) });
    expect(screen.queryByRole('button', { name: /load older activity/i })).toBeNull();
  });

  it('clicking "Load older activity" re-queries useAuditLogs with a higher limit (server-side, not a client re-slice)', async () => {
    const { user } = setup({ audit: auditRows(60) });
    expect(useAuditLogs).toHaveBeenLastCalledWith({ limit: 60, managerId: '' });

    await user.click(screen.getByRole('button', { name: /load older activity/i }));

    expect(useAuditLogs).toHaveBeenLastCalledWith({ limit: 120, managerId: '' });
  });

  it('reaches the 200-row cap after enough clicks and shows the "most it can retrieve" note instead of a button', async () => {
    useOperationsOverview.mockReturnValue({ data: { data: [MGR_A, MGR_B] }, isLoading: false, error: null, refetch: vi.fn() });
    useOperationManagerDetail.mockReturnValue({ data: undefined, isLoading: false, error: null, refetch: vi.fn() });
    usePendingVehicleRequests.mockReturnValue({ data: { data: [] }, isLoading: false, error: null, refetch: vi.fn() });
    useReviewVehicleRequest.mockReturnValue(makeMutation());
    useUpdateVehicle.mockReturnValue(makeMutation());

    // 60 -> 120 -> 180 -> 200 (clamped): each click bumps the limit the
    // component asks for; the mock always returns a full page for the
    // *current* limit so canLoadMoreAudit keeps evaluating true until 200.
    useAuditLogs.mockImplementation(({ limit }) => ({
      data: { data: auditRows(Math.min(limit, 200)) },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    }));

    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={['/operations']}>
          <OperationsPage />
        </MemoryRouter>
      </TooltipProvider>,
    );

    const clickLoadMore = async () => user.click(screen.getByRole('button', { name: /load older activity/i }));
    await clickLoadMore(); // 60 -> 120
    await clickLoadMore(); // 120 -> 180
    await clickLoadMore(); // 180 -> 200 (clamped)

    expect(useAuditLogs).toHaveBeenLastCalledWith({ limit: 200, managerId: '' });
    expect(screen.queryByRole('button', { name: /load older activity/i })).toBeNull();
    expect(screen.getByText(/most this view can currently retrieve/i)).toBeInTheDocument();
  });

  it('resets the audit limit back to 60 when the manager filter changes', async () => {
    const { user } = setup({ audit: auditRows(60), overview: [MGR_A, MGR_B] });
    await user.click(screen.getByRole('button', { name: /load older activity/i }));
    expect(useAuditLogs).toHaveBeenLastCalledWith({ limit: 120, managerId: '' });

    await user.click(screen.getByRole('combobox', { name: /filter audit log by manager/i }));
    await user.click(await screen.findByRole('option', { name: 'Alice Smith' }));

    expect(useAuditLogs).toHaveBeenLastCalledWith({ limit: 60, managerId: 'm1' });
  });

  it('opens vehicle edit FormDialog when Edit is clicked', async () => {
    const { user } = setup({ detail: DETAIL_A });
    await user.click(screen.getByText('Alice Smith'));
    await waitFor(() => { expect(screen.getByText('Vehicle Alpha')).toBeInTheDocument(); });
    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Vehicle')).toBeInTheDocument();
  });

  it('calls updateVehicle mutation when vehicle edit dialog is saved', async () => {
    const updateVehicleMut = makeMutation();
    const { user } = setup({ detail: DETAIL_A, updateVehicleMut });
    await user.click(screen.getByText('Alice Smith'));
    await waitFor(() => { expect(screen.getByText('Vehicle Alpha')).toBeInTheDocument(); });
    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(updateVehicleMut.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleId: 'b1', payload: { serviceType: 'PUBLIC' } }),
    );
  });
});
