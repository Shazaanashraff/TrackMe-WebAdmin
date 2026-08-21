import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  vehicles: { activeVehicles: 10, inactiveVehicles: 1 },
  bookings: { confirmedBookings: 25 },
  reviews: { averageRating: 4.2 },
};

function makeOp(id, name = 'Route A', active = true) {
  return { _id: id, routeName: name, managerName: 'Mgr', isActive: active, activeVehicles: 3 };
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
    expect(screen.getByText('Active Vehicles')).toBeInTheDocument();
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

  it('names the empty state when average rating is absent', () => {
    setup({ metrics: { ...METRICS, reviews: undefined } });
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  // Some Mongo aggregation pipelines serialize Decimal128 as a string — a plain
  // null-check let that reach .toFixed() directly and throw (issue #64).
  it('does not crash when averageRating is a stringified number', () => {
    setup({ metrics: { ...METRICS, reviews: { averageRating: '4.2' } } });
    expect(screen.getByText('Avg Rating')).toBeInTheDocument();
    expect(screen.getAllByText('4.2').length).toBeGreaterThan(0);
  });

  it('shows error banner when dashboard query fails', () => {
    setup({ error: new Error('Server error'), metrics: null });
    expect(screen.getAllByText(/failed to load/i).length).toBeGreaterThan(0);
  });

  // The KPI cards used to keep rendering computed '0's during a fetch error,
  // which reads as real data at a glance (issue #51).
  it('shows an error placeholder on every KPI card during a fetch error, not "0"', () => {
    setup({ error: new Error('Server error'), metrics: null });
    expect(screen.getAllByText('—').length).toBe(4);
    expect(screen.queryByText('0')).toBeNull();
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
    expect(screen.getByText('Pending vehicle requests')).toBeInTheDocument();
    expect(screen.getByText('Inactive vehicles')).toBeInTheDocument();
  });

  it('shows analytics placeholder with no fabricated numbers', () => {
    setup();
    expect(screen.getByText('Not enough data yet')).toBeInTheDocument();
  });

  it('keeps the analytics placeholder compact, not a full-height empty card (issue #15)', () => {
    setup();
    const placeholder = screen.getByText('Not enough data yet');
    // The old placeholder padded a large centered block (py-10) with a big icon and two
    // paragraphs of copy; issue #15 asked for this to stop dominating the page. A slim
    // single-row treatment has no "py-10" ancestor between the text and its Card.
    const card = placeholder.closest('.py-3');
    expect(card).toBeInTheDocument();
    expect(placeholder.closest('.py-10')).toBeNull();
  });
});
