import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ManagerDashboardPage } from '../ManagerDashboardPage';

vi.mock('@/hooks/use-dashboard', () => ({
  useManagerDashboard: vi.fn(),
}));

vi.mock('@/hooks/use-tracking', async (importOriginal) => ({
  ...(await importOriginal()),
  useManagerFleetLive: vi.fn(),
}));

import { useManagerDashboard } from '@/hooks/use-dashboard';
import { useManagerFleetLive } from '@/hooks/use-tracking';

const DASHBOARD = {
  fleet: { totalVehicles: 8, activeVehicles: 6 },
  pendingRequests: 2,
};

const now = () => new Date().toISOString();
const FLEET = [
  {
    vehicleId: 'BUS-1', live: true, location: { lat: 6.9, lng: 79.8, receivedAt: now() },
    vehicle: { vehicleName: 'Morning Express' }, driver: { name: 'Sunil Jayasinghe' },
  },
  {
    vehicleId: 'BUS-2', live: false, location: null,
    vehicle: { vehicleName: 'Parked Bus' }, driver: { name: 'Ruwan Bandara' },
  },
];

function setup({
  data = DASHBOARD, loading = false, error = null, fleet = FLEET, fleetLoading = false,
} = {}) {
  useManagerDashboard.mockReturnValue({
    data: data ? { data } : undefined,
    isLoading: loading,
    isError: Boolean(error),
    error,
    refetch: vi.fn(),
  });
  useManagerFleetLive.mockReturnValue({
    data: fleet ? { data: fleet } : undefined,
    isLoading: fleetLoading,
    error: null,
    refetch: vi.fn(),
  });
  const user = userEvent.setup();
  render(<MemoryRouter><ManagerDashboardPage /></MemoryRouter>);
  return { user };
}

describe('ManagerDashboardPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the page heading without the old description', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /manager dashboard/i })).toBeInTheDocument();
    expect(screen.queryByText(/live overview/i)).toBeNull();
  });

  it('shows loading skeletons when fetching', () => {
    setup({ loading: true, data: null });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shows error state when dashboard query fails', () => {
    setup({ error: new Error('Server error'), data: null });
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('puts total, active and pending in one vehicles card', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Vehicles' })).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // The three separate stat cards are gone.
    expect(screen.queryByText('Total Vehicles')).toBeNull();
    expect(screen.queryByText('Pending Requests')).toBeNull();
  });

  it('hides the pending figure when nothing is pending', () => {
    setup({ data: { ...DASHBOARD, pendingRequests: 0 } });
    expect(screen.queryByText('Pending')).toBeNull();
  });

  // The backend still aggregates revenue and booking counts, but nothing in the
  // product creates a booking, so they read zero forever. Removed 2026-09-23;
  // this case exists so they cannot quietly come back. The Payments preview is
  // a labelled sample and is the only place money appears.
  it('shows no booking metrics', () => {
    setup();
    expect(screen.queryByText(/booking/i)).toBeNull();
  });

  it('lists only vehicles on a journey and links each to the live tracking page', () => {
    setup();
    const link = screen.getByRole('link', { name: /morning express/i });
    expect(link).toHaveAttribute('href', '/manager/tracking?vehicle=BUS-1');
    expect(screen.getByText('Sunil Jayasinghe')).toBeInTheDocument();
    expect(screen.queryByText('Parked Bus')).toBeNull();
  });

  it('says so when no vehicle is running', () => {
    setup({ fleet: [FLEET[1]] });
    expect(screen.getByText(/no vehicle is running/i)).toBeInTheDocument();
  });

  it('labels the payments section as coming soon', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('keeps payment amounts hidden until the eye button is pressed', async () => {
    const { user } = setup();
    expect(document.body.textContent).not.toMatch(/LKR/);

    await user.click(screen.getByRole('button', { name: 'Show amounts' }));
    expect(document.body.textContent).toMatch(/LKR/);

    await user.click(screen.getByRole('button', { name: 'Hide amounts' }));
    expect(document.body.textContent).not.toMatch(/LKR/);
  });
});
