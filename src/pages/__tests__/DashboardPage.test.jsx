import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';

vi.mock('@/hooks/use-dashboard', () => ({
  useSuperAdminDashboard: vi.fn(),
}));
vi.mock('@/hooks/use-operations', () => ({
  useOperationsOverview: vi.fn(),
  usePendingBusRequests: vi.fn(),
}));

import { useSuperAdminDashboard } from '@/hooks/use-dashboard';
import { useOperationsOverview, usePendingBusRequests } from '@/hooks/use-operations';

const METRICS = {
  managers: { totalManagers: 4 },
  buses: { activeBuses: 10, inactiveBuses: 1 },
  bookings: { confirmedBookings: 25 },
  reviews: { averageRating: 4.2 },
};

function makeOp(id, name = 'Route A', active = true) {
  return { _id: id, routeName: name, managerName: 'Mgr', isActive: active, activeBuses: 3 };
}

function defaultHooks({ metrics = METRICS, ops = [], pending = [], loading = false, error = null } = {}) {
  useSuperAdminDashboard.mockReturnValue({
    data: metrics ? { data: metrics } : undefined,
    isLoading: loading,
    isError: Boolean(error),
    error,
    refetch: vi.fn(),
  });
  useOperationsOverview.mockReturnValue({
    data: { data: ops },
    isLoading: loading,
    error: null,
    refetch: vi.fn(),
  });
  usePendingBusRequests.mockReturnValue({
    data: { data: pending },
    isLoading: false,
  });
}

function setup(opts) {
  defaultHooks(opts);
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>);
}

describe('DashboardPage', () => {
  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('shows loading skeletons for stat cards while fetching', () => {
    setup({ loading: true, metrics: null });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('renders real KPI values without fabricated percentages', () => {
    setup();
    // Stat card labels confirm the right sections are rendered
    expect(screen.getByText('Total Managers')).toBeInTheDocument();
    expect(screen.getByText('Active Buses')).toBeInTheDocument();
    expect(screen.getByText('Confirmed Bookings')).toBeInTheDocument();
    expect(screen.getByText('Avg Rating')).toBeInTheDocument();

    // Values from METRICS fixture appear somewhere on the page
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('25').length).toBeGreaterThan(0);

    // Must NOT fabricate percentage deltas or fake timestamps
    expect(screen.queryByText(/\+18%/)).toBeNull();
    expect(screen.queryByText(/\+24%/)).toBeNull();
    expect(screen.queryByText(/updated \d+ min ago/i)).toBeNull();
  });

  it('shows dash when average rating is absent', () => {
    setup({ metrics: { ...METRICS, reviews: undefined } });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows error banner when dashboard query fails', () => {
    setup({ error: new Error('Server error'), metrics: null });
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('renders operations table rows', () => {
    setup({ ops: [makeOp('1', 'Colombo–Kandy'), makeOp('2', 'Galle–Matara')] });
    expect(screen.getByText('Colombo–Kandy')).toBeInTheDocument();
    expect(screen.getByText('Galle–Matara')).toBeInTheDocument();
  });

  it('shows online badge for active routes, offline for inactive', () => {
    setup({ ops: [makeOp('1', 'R1', true), makeOp('2', 'R2', false)] });
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows empty state when no operations are returned', () => {
    setup({ ops: [] });
    expect(screen.getByText('No active routes')).toBeInTheDocument();
  });

  it('shows fleet snapshot rows', () => {
    setup({ pending: [{ id: 'p1' }, { id: 'p2' }] });
    expect(screen.getByText('Pending bus requests')).toBeInTheDocument();
    expect(screen.getByText('Inactive buses')).toBeInTheDocument();
  });

  it('shows analytics placeholder with no fabricated numbers', () => {
    setup();
    expect(screen.getByText('Not enough data yet')).toBeInTheDocument();
  });
});
