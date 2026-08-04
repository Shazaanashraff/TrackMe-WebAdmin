import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ManagerAccountsPage } from '../ManagerAccountsPage';

vi.mock('@/hooks/use-vehicles', () => ({
  useManagerVehicles: vi.fn(),
  useResetVehicleAccountPassword: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import { useManagerVehicles, useResetVehicleAccountPassword } from '@/hooks/use-vehicles';
import { toast } from 'sonner';

const VEHICLES = [
  { _id: 'b1', vehicleId: 'VEHICLE-1', vehicleName: 'Shuttle 1', numberPlate: 'AB-1234', routeId: 'PUB-1', driverId: { email: 'driver@test.com' } },
  { _id: 'b2', vehicleId: 'VEHICLE-2', vehicleName: 'Express 2', numberPlate: 'CD-5678', routeId: 'PUB-2' },
];

function makeMutation(overrides = {}) {
  return { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, ...overrides };
}

function defaultHooks({ vehicles = VEHICLES, loading = false, error = null, resetMut } = {}) {
  useManagerVehicles.mockReturnValue({
    data: vehicles ? { data: vehicles } : undefined,
    isLoading: loading,
    isError: Boolean(error),
    error,
    refetch: vi.fn(),
  });
  useResetVehicleAccountPassword.mockReturnValue(resetMut || makeMutation());
}

function setup(opts) {
  defaultHooks(opts);
  const user = userEvent.setup();
  render(<MemoryRouter><ManagerAccountsPage /></MemoryRouter>);
  return { user };
}

describe('ManagerAccountsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /account management/i })).toBeInTheDocument();
  });

  it('shows managed vehicles count stat card', () => {
    setup();
    expect(screen.getByText('Managed Vehicles')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('renders the form during load (loading does not crash)', () => {
    setup({ loading: true, vehicles: null });
    // Page heading and form remain visible during load
    expect(screen.getByRole('heading', { level: 1, name: /account management/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
  });

  it('renders reset form with vehicle select and password input', () => {
    setup();
    expect(screen.getByLabelText(/^vehicle$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
  });

  it('renders context panel with selected vehicle details', () => {
    setup();
    // Auto-selects first vehicle → context shows VEHICLE-1 details
    expect(screen.getByText(/Selected Account Context/i)).toBeInTheDocument();
  });

  it('shows validation error when no vehicle is selected', async () => {
    const { user } = setup({ vehicles: [] }); // empty = no auto-select
    await user.type(screen.getByLabelText(/new password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(screen.getByText(/please select a vehicle/i)).toBeInTheDocument();
  });

  it('shows validation error when password is empty', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(screen.getByText(/new password is required/i)).toBeInTheDocument();
  });

  it('shows validation error when password is too short', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/new password/i), 'short');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('calls resetVehicleAccountPassword mutation with correct payload', async () => {
    const resetMut = makeMutation();
    const { user } = setup({ resetMut });

    await user.type(screen.getByLabelText(/new password/i), 'Secure1234!');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(resetMut.mutateAsync).toHaveBeenCalledTimes(1));
    const call = resetMut.mutateAsync.mock.calls[0][0];
    expect(call.vehicleId).toBe('VEHICLE-1'); // auto-selected first vehicle
    expect(call.payload.password).toBe('Secure1234!');
  });

  it('shows success toast and clears password on success', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/new password/i), 'Secure1234!');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringMatching(/updated successfully/i)));
    expect(screen.getByLabelText(/new password/i)).toHaveValue('');
  });

  it('shows server error on mutation failure', async () => {
    const resetMut = makeMutation({ mutateAsync: vi.fn().mockRejectedValue(new Error('Server error')) });
    const { user } = setup({ resetMut });

    await user.type(screen.getByLabelText(/new password/i), 'Secure1234!');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument());
  });
});
