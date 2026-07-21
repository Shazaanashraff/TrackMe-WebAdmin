import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OperationsPage } from '../OperationsPage';

vi.mock('@/hooks/use-operations', () => ({
  useOperationsOverview: vi.fn(),
  useOperationManagerDetail: vi.fn(),
  usePendingBusRequests: vi.fn(),
  useAuditLogs: vi.fn(),
  useReviewBusRequest: vi.fn(),
  useUpdateBus: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import {
  useOperationsOverview,
  useOperationManagerDetail,
  usePendingBusRequests,
  useAuditLogs,
  useReviewBusRequest,
  useUpdateBus,
} from '@/hooks/use-operations';

const MGR_A = { managerId: 'm1', managerName: 'Alice Smith', isActive: true, fleet: { totalBuses: 3 }, bookings: { totalBookings: 20 } };
const MGR_B = { managerId: 'm2', managerName: 'Bob Jones', isActive: false, fleet: { totalBuses: 1 }, bookings: { totalBookings: 5 } };

const DETAIL_A = {
  manager: { name: 'Alice Smith', email: 'alice@co.com' },
  buses: [
    {
      _id: 'b1',
      busName: 'Bus Alpha',
      serviceType: 'PUBLIC',
      isActive: true,
      bookingMetrics: { totalBookings: 15, totalRevenue: 300 },
      reviewMetrics: { averageRating: 4.5 },
    },
  ],
};

const REQ_A = {
  _id: 'r1',
  type: 'NEW_BUS',
  managerId: { name: 'Alice Smith' },
  busId: 'BUS-001',
  createdAt: '2026-07-17T10:00:00Z',
  reason: 'Expanding fleet',
  status: 'PENDING',
};

const AUDIT_A = {
  _id: 'a1',
  createdAt: '2026-07-17T09:00:00Z',
  managerId: { name: 'Alice Smith' },
  action: 'BUS_UPDATED',
  entityType: 'Bus',
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
  updateBusMut,
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
  usePendingBusRequests.mockReturnValue({
    data: { data: requests },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  useAuditLogs.mockReturnValue({
    data: { data: audit },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  useReviewBusRequest.mockReturnValue(reviewMut || makeMutation());
  useUpdateBus.mockReturnValue(updateBusMut || makeMutation());
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

  it('shows online/offline status badges for managers', () => {
    setup();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('auto-selects first manager and shows detail on load', async () => {
    setup({ detail: DETAIL_A });
    await waitFor(() => {
      expect(screen.getByText('Bus Alpha')).toBeInTheDocument();
    });
  });

  it('preselects the manager passed via ?managerId= instead of the first row', () => {
    setup({ detail: DETAIL_A }, { initialEntries: ['/operations?managerId=m2'] });
    expect(useOperationManagerDetail).toHaveBeenCalledWith('m2');
  });

  it('shows empty state panel when no managers exist', () => {
    setup({ overview: [] });
    expect(screen.getByText('No manager selected')).toBeInTheDocument();
  });

  it('renders pending request rows in the Bus Requests table', () => {
    setup({ requests: [REQ_A] });
    expect(screen.getByText('NEW_BUS')).toBeInTheDocument();
    expect(screen.getByText('BUS-001')).toBeInTheDocument();
    expect(screen.getByText('Expanding fleet')).toBeInTheDocument();
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

  it('shows empty state when no requests exist', () => {
    setup({ requests: [] });
    expect(screen.getByText('No requests')).toBeInTheDocument();
  });

  it('renders audit log rows', () => {
    setup({ audit: [AUDIT_A] });
    expect(screen.getByText('BUS_UPDATED')).toBeInTheDocument();
    expect(screen.getByText('Bus')).toBeInTheDocument();
    expect(screen.getByText('admin@co.com')).toBeInTheDocument();
  });

  it('opens bus edit FormDialog when Edit is clicked', async () => {
    const { user } = setup({ detail: DETAIL_A });
    await waitFor(() => { expect(screen.getByText('Bus Alpha')).toBeInTheDocument(); });
    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Edit Bus')).toBeInTheDocument();
  });

  it('calls updateBus mutation when bus edit dialog is saved', async () => {
    const updateBusMut = makeMutation();
    const { user } = setup({ detail: DETAIL_A, updateBusMut });
    await waitFor(() => { expect(screen.getByText('Bus Alpha')).toBeInTheDocument(); });
    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(updateBusMut.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ busId: 'b1', payload: { serviceType: 'PUBLIC' } }),
    );
  });
});
