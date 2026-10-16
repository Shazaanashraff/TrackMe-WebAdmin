import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';

vi.mock('@/hooks/use-dashboard', () => ({
  useSuperAdminDashboard: vi.fn(),
}));
vi.mock('@/hooks/use-operations', () => ({
  useOperationsOverview: vi.fn(),
  usePendingVehicleRequests: vi.fn(),
}));

import { useSuperAdminDashboard } from '@/hooks/use-dashboard';
import { useOperationsOverview, usePendingVehicleRequests } from '@/hooks/use-operations';

const METRICS = {
  managers: { totalManagers: 4 },
  vehicles: { activeVehicles: 10, inactiveVehicles: 3 },
  bookings: { confirmedBookings: 25 },
  reviews: { averageRating: 0 },
};

function makeOp(id, name, active = 3, inactive = 1) {
  return { managerId: id, managerName: name, fleet: { totalVehicles: active + inactive, activeVehicles: active, inactiveVehicles: inactive } };
}

const REQUESTS = [
  {
    _id: 'r1', type: 'CREATE_VEHICLE_ACCOUNT', vehicleId: 'BUS-9',
    managerId: { name: 'Nimal Perera' }, payload: { vehicle: { vehicleName: 'Evening Run' } },
  },
  {
    _id: 'r2', type: 'DELETE_VEHICLE', vehicleId: 'BUS-2',
    managerId: { name: 'Kasun Fernando' }, payload: { vehicleSnapshot: { vehicleName: 'Old Bus' } },
  },
];

function defaultHooks({
  metrics = METRICS, ops = [makeOp('m1', 'Nimal Perera')], pending = REQUESTS,
  loading = false, error = null, opsError = null,
} = {}) {
  useSuperAdminDashboard.mockReturnValue({
    data: metrics ? { data: metrics } : undefined,
    isLoading: loading,
    isError: Boolean(error),
    error,
    refetch: vi.fn(),
  });
  useOperationsOverview.mockReturnValue({
    data: opsError ? undefined : { data: ops },
    isLoading: loading,
    error: opsError,
    refetch: vi.fn(),
  });
  usePendingVehicleRequests.mockReturnValue({
    data: { data: pending },
    isLoading: false,
  });
}

function setup(opts) {
  defaultHooks(opts);
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>);
}

describe('DashboardPage', () => {
  it('renders the page heading without a description', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /dashboard/i })).toBeInTheDocument();
    expect(screen.queryByText(/fleet operations overview/i)).toBeNull();
  });

  it('shows loading skeletons while fetching', () => {
    setup({ loading: true, metrics: null });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('puts managers, vehicles and pending requests in one Fleet card', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Fleet' })).toBeInTheDocument();
    expect(screen.getByText('Managers')).toBeInTheDocument();
    expect(screen.getByText('Active vehicles')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Pending requests')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('hides inactive and pending when there are none', () => {
    setup({
      metrics: { ...METRICS, vehicles: { activeVehicles: 10, inactiveVehicles: 0 } },
      pending: [],
    });
    expect(screen.queryByText('Inactive')).toBeNull();
    expect(screen.queryByText('Pending requests')).toBeNull();
  });

  it('links managers and pending requests to the pages that hold them', () => {
    setup();
    expect(screen.getByRole('link', { name: /managers/i })).toHaveAttribute('href', '/managers');
    expect(screen.getByRole('link', { name: /pending requests/i })).toHaveAttribute('href', '/operations');
  });

  // Nothing creates a booking or a review, so both read zero forever, and the
  // backend sends 0 (not null) for a missing average. They must not return.
  it('shows no booking or rating figures', () => {
    setup();
    expect(screen.queryByText(/booking/i)).toBeNull();
    expect(screen.queryByText(/rating/i)).toBeNull();
    expect(screen.queryByText(/analytics/i)).toBeNull();
  });

  it('holds the chart behind a skeleton, then mounts it so the bars animate in', () => {
    vi.useFakeTimers();
    try {
      setup();
      expect(document.querySelectorAll('[data-chart]')).toHaveLength(0);
      expect(document.querySelectorAll('[aria-hidden].animate-pulse')).toHaveLength(1);

      act(() => { vi.advanceTimersByTime(600); });
      expect(document.querySelectorAll('[data-chart]')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('names the empty state when no manager has a vehicle', () => {
    setup({ ops: [makeOp('m1', 'Nimal Perera', 0, 0)] });
    expect(screen.getByText('No vehicles yet')).toBeInTheDocument();
  });

  it('lists waiting requests in plain words and links to Operations', () => {
    setup();
    expect(screen.getByText(/New vehicle: Evening Run/)).toBeInTheDocument();
    expect(screen.getByText(/Remove vehicle: Old Bus/)).toBeInTheDocument();
    expect(screen.queryByText('CREATE_VEHICLE_ACCOUNT')).toBeNull();
    expect(screen.getByRole('link', { name: /Evening Run/ })).toHaveAttribute('href', '/operations');
  });

  it('says nothing is waiting when there are no requests', () => {
    setup({ pending: [] });
    expect(screen.getByText('Nothing waiting')).toBeInTheDocument();
  });

  it('shows the error state when the dashboard query fails', () => {
    setup({ error: new Error('Server error'), metrics: null });
    expect(screen.getAllByText(/failed to load/i).length).toBeGreaterThan(0);
  });

  // Issue #26: the queries are independent, so one failing must not take the
  // others down with it.
  it('keeps the Fleet card when only the operations query fails, showing that error only in the chart card', () => {
    setup({ opsError: Object.assign(new Error('Internal server error'), { status: 500 }) });
    expect(screen.getByText('Active vehicles')).toBeInTheDocument();
    expect(screen.getAllByText('Failed to load')).toHaveLength(1);
  });

  describe('offline', () => {
    function setOnline(value) {
      Object.defineProperty(navigator, 'onLine', { value, writable: true, configurable: true });
    }
    afterEach(() => setOnline(true));

    it('offline with a cached payload keeps the real numbers and says it is showing saved information', () => {
      setOnline(false);
      setup({ error: new Error('Failed to fetch') });

      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText(/offline — showing saved information/i)).toBeInTheDocument();
      expect(screen.queryByText('Failed to load')).toBeNull();
    });
  });
});
