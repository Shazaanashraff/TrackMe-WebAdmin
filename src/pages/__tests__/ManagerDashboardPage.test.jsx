import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ManagerDashboardPage } from '../ManagerDashboardPage';

vi.mock('@/hooks/use-dashboard', () => ({
  useManagerDashboard: vi.fn(),
}));

import { useManagerDashboard } from '@/hooks/use-dashboard';

const DASHBOARD = {
  fleet: { totalBuses: 8, activeBuses: 6 },
  pendingRequests: 2,
  bookings: { confirmedBookings: 40, cancelledBookings: 3, totalRevenue: 12000 },
};

function defaultHooks({ data = DASHBOARD, loading = false, error = null } = {}) {
  useManagerDashboard.mockReturnValue({
    data: data ? { data } : undefined,
    isLoading: loading,
    isError: Boolean(error),
    error,
    refetch: vi.fn(),
  });
}

function setup(opts) {
  defaultHooks(opts);
  return render(<MemoryRouter><ManagerDashboardPage /></MemoryRouter>);
}

describe('ManagerDashboardPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /manager dashboard/i })).toBeInTheDocument();
  });

  it('shows loading skeletons when fetching', () => {
    setup({ loading: true, data: null });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shows error state when dashboard query fails', () => {
    setup({ error: new Error('Server error'), data: null });
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('renders real KPI values without fabricated deltas', () => {
    setup();
    expect(screen.getByText('Total Vehicles')).toBeInTheDocument();
    expect(screen.getByText('Active Vehicles')).toBeInTheDocument();
    expect(screen.getByText('Pending Requests')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();

    // Total = 8, utilization = 75%
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
    expect(screen.getByText(/75%/)).toBeInTheDocument();

    // Must not fabricate percentage deltas
    expect(screen.queryByText(/\+0%/)).toBeNull();
    expect(screen.queryByText(/\+12%/)).toBeNull();
    expect(screen.queryByText(/peaking/i)).toBeNull();
  });

  it('renders revenue without wrong currency symbols', () => {
    setup();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/₹/);
    expect(document.body.textContent).not.toMatch(/\$\d/);
  });

  it('shows confirmed and cancelled booking counts', () => {
    setup();
    expect(screen.getByText('Confirmed Bookings')).toBeInTheDocument();
    expect(screen.getByText('Cancelled Bookings')).toBeInTheDocument();
    expect(screen.getAllByText('40').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('shows analytics placeholder without fabricated time-series', () => {
    setup();
    expect(screen.getByText('Not enough data yet')).toBeInTheDocument();
  });

  it('shows pending request count in stat card', () => {
    setup();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });
});
