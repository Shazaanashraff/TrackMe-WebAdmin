import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ManagerDashboardPage } from '../ManagerDashboardPage';

vi.mock('@/hooks/use-dashboard', () => ({
  useManagerDashboard: vi.fn(),
}));

import { useManagerDashboard } from '@/hooks/use-dashboard';

const DASHBOARD = {
  fleet: { totalVehicles: 8, activeVehicles: 6 },
  pendingRequests: 2,
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

    // Total = 8, utilization = 75%
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
    expect(screen.getByText(/75%/)).toBeInTheDocument();

    // Must not fabricate percentage deltas
    expect(screen.queryByText(/\+0%/)).toBeNull();
    expect(screen.queryByText(/\+12%/)).toBeNull();
    expect(screen.queryByText(/peaking/i)).toBeNull();
  });

  // The backend still aggregates revenue and booking counts, but nothing in the
  // product creates a booking (the passenger app's booking screens are not in
  // its navigation), so they read zero forever. Removed 2026-09-23; this case
  // exists so they cannot quietly come back.
  it('shows no revenue or booking metrics', () => {
    setup();
    expect(screen.queryByText(/revenue/i)).toBeNull();
    expect(screen.queryByText(/booking/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(/LKR/);
  });

  it('shows pending request count in stat card', () => {
    setup();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('clamps utilization to 100% when active vehicles exceeds total (issue #59)', () => {
    setup({ data: { ...DASHBOARD, fleet: { totalVehicles: 5, activeVehicles: 7 } } });
    expect(screen.getByText(/100%/)).toBeInTheDocument();
    expect(screen.queryByText(/140%/)).toBeNull();
  });
});
