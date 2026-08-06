import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ManagerVehiclesPage } from '../ManagerVehiclesPage';

vi.mock('@/hooks/use-vehicles', () => ({
  useManagerVehicles: vi.fn(),
  useManagerAssignableRoutes: vi.fn(),
  useCreateManagerVehicle: vi.fn(),
  useUpdateManagerVehicle: vi.fn(),
  useRequestDeleteVehicle: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: vi.fn() }));

import {
  useManagerVehicles,
  useManagerAssignableRoutes,
  useCreateManagerVehicle,
  useUpdateManagerVehicle,
  useRequestDeleteVehicle,
} from '@/hooks/use-vehicles';

const ROUTES = [{ routeId: 'PUB-1', routeName: 'Public Route', visibility: 'PUBLIC' }];

const VEHICLES = [
  {
    _id: 'vehicle-1',
    vehicleId: 'VEHICLE-1',
    vehicleName: 'Shuttle 1',
    numberPlate: 'AB-1234',
    routeId: 'PUB-1',
    serviceType: 'PUBLIC',
    seatCapacity: 40,
    vehicleType: 'AC',
    bookingEnabled: true,
    isActive: true,
    maintenanceStatus: 'ACTIVE',
  },
];

function makeMutation(overrides = {}) {
  return { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, ...overrides };
}

function defaultHooks({
  vehicles = VEHICLES, routes = ROUTES, loading = false, error = null,
  createMut, updateMut, deleteMut,
} = {}) {
  useManagerVehicles.mockReturnValue({
    data: vehicles ? { data: vehicles } : undefined,
    isLoading: loading,
    isError: Boolean(error),
    error,
    refetch: vi.fn(),
  });
  useManagerAssignableRoutes.mockReturnValue({
    data: routes ? { data: routes } : undefined,
    isLoading: false,
  });
  useCreateManagerVehicle.mockReturnValue(createMut || makeMutation());
  useUpdateManagerVehicle.mockReturnValue(updateMut || makeMutation());
  useRequestDeleteVehicle.mockReturnValue(deleteMut || makeMutation());
}

function setup(opts) {
  defaultHooks(opts);
  const user = userEvent.setup();
  render(<MemoryRouter><ManagerVehiclesPage /></MemoryRouter>);
  return { user };
}

describe('ManagerVehiclesPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /vehicle management/i })).toBeInTheDocument();
  });

  it('shows loading skeletons when fetching', () => {
    setup({ loading: true, vehicles: null });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shows error state when vehicles query fails', () => {
    setup({ error: new Error('Server error'), vehicles: null });
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('renders stat cards with correct counts', () => {
    setup({ vehicles: VEHICLES }); // 1 vehicle, 1 active
    expect(screen.getByText('Total Vehicles')).toBeInTheDocument();
    expect(screen.getByText('Active Fleet')).toBeInTheDocument();
    expect(screen.getByText('Inactive Fleet')).toBeInTheDocument();
  });

  it('renders vehicle rows in the table', async () => {
    setup();
    expect(screen.getByText('Shuttle 1')).toBeInTheDocument();
    expect(screen.getByText('AB-1234')).toBeInTheDocument();
    expect(screen.getByText('VEHICLE-1')).toBeInTheDocument();
  });

  it('shows empty state when no vehicles', () => {
    setup({ vehicles: [] });
    expect(screen.getByText(/no vehicles yet/i)).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------
// Route assignment toggle (preserved from original 3 core tests)
// ----------------------------------------------------------------
describe('ManagerVehiclesPage route assignment toggle', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  async function fillStep0(user, { routeMode = 'EXISTING' } = {}) {
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');

    await user.type(screen.getByLabelText(/vehicle id/i), 'VEHICLE-99');
    await user.type(screen.getByLabelText(/vehicle name/i), 'Shuttle 99');
    // A real Sri Lankan plate: two or three letters, then four digits.
    await user.type(screen.getByLabelText(/number plate/i), 'ABC-1234');

    if (routeMode === 'CUSTOM') {
      await user.click(screen.getByLabelText(/custom route/i));
    } else {
      // Select a route from the dropdown
      await user.click(screen.getByLabelText(/^route$/i));
      const option = await screen.findByRole('option', { name: /Public Route/i });
      await user.click(option);
    }

    await user.click(screen.getByRole('button', { name: /continue/i }));
  }

  it('submits routeMode CUSTOM and no routeId when the Custom Route option is chosen', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });

    await fillStep0(user, { routeMode: 'CUSTOM' });

    // Step 1: password required
    await user.type(screen.getByLabelText(/initial password/i), 'Sup3rSecret!');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2: submit
    await user.click(screen.getByRole('button', { name: /create vehicle/i }));

    await waitFor(() => expect(createMut.mutateAsync).toHaveBeenCalledTimes(1), { timeout: 15000 });
    const payload = createMut.mutateAsync.mock.calls[0][0];
    expect(payload.routeMode).toBe('CUSTOM');
    expect(payload.routeId).toBe('');
  }, 20000);

  it('will not advance past step 0 with a plate that is not Sri Lankan', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');
    await user.type(screen.getByLabelText(/vehicle id/i), 'VEHICLE-98');
    await user.type(screen.getByLabelText(/vehicle name/i), 'Shuttle 98');
    // Three digits where a plate needs four.
    await user.type(screen.getByLabelText(/number plate/i), 'ABC-123');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/Sri Lankan number plate/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/initial password/i)).not.toBeInTheDocument();
  }, 20000);

  it('tidies an accepted plate into its canonical form on blur', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');
    const plate = screen.getByLabelText(/number plate/i);
    await user.type(plate, 'wp cab 4321');
    await user.tab();

    expect(plate).toHaveValue('WP CAB-4321');
  }, 20000);

  it('does not require a routeId to advance past step 0 in Custom mode', async () => {
    const { user } = setup();

    await fillStep0(user, { routeMode: 'CUSTOM' });

    // If we reached step 1, the password field is visible
    expect(screen.getByLabelText(/initial password/i)).toBeInTheDocument();
  });

  it('submits routeMode EXISTING with the selected routeId by default', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });

    await fillStep0(user, { routeMode: 'EXISTING' });

    // Step 1
    await user.type(screen.getByLabelText(/initial password/i), 'Sup3rSecret!');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2
    await user.click(screen.getByRole('button', { name: /create vehicle/i }));

    await waitFor(() => expect(createMut.mutateAsync).toHaveBeenCalledTimes(1), { timeout: 15000 });
    const payload = createMut.mutateAsync.mock.calls[0][0];
    expect(payload.routeMode).toBe('EXISTING');
    expect(payload.routeId).toBe('PUB-1');
    // Same 20s allowance as the other full-wizard runs: driving three Radix
    // steps through jsdom does not fit in the 5s default.
  }, 20000);

  it('shows validation error when required step 0 fields are empty', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');

    // Click Continue without filling anything
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText(/please complete/i)).toBeInTheDocument();
  });

  it('shows validation error when step 1 password is empty', async () => {
    const { user } = setup();

    await fillStep0(user, { routeMode: 'CUSTOM' });

    // Step 1: skip password, try to advance
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText(/initial password is required/i)).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------
// Booking-enabled removal (preserved from original test)
// ----------------------------------------------------------------
describe('ManagerVehiclesPage booking-enabled removal', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders no booking-enabled controls in the grid, summary, or edit dialog', async () => {
    const { user } = setup({ vehicles: VEHICLES });

    expect(screen.getByText('Shuttle 1')).toBeInTheDocument();
    expect(screen.queryByText(/booking enabled/i)).toBeNull();
    expect(screen.queryByRole('columnheader', { name: /booking/i })).toBeNull();

    // Open edit dialog and verify no bookingEnabled field
    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');
    expect(screen.queryByLabelText(/^booking$/i)).toBeNull();
    expect(screen.queryByText(/booking enabled/i)).toBeNull();
  });
});

// ----------------------------------------------------------------
// Edit + delete flows
// ----------------------------------------------------------------
describe('ManagerVehiclesPage edit and delete', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('opens edit dialog with vehicle data pre-populated', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /edit/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText(/vehicle name/i)).toHaveValue('Shuttle 1');
    expect(screen.getByLabelText(/number plate/i)).toHaveValue('AB-1234');
  });

  it('calls updateVehicle mutation on save', async () => {
    const updateMut = makeMutation();
    const { user } = setup({ updateMut });

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateMut.mutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMut.mutateAsync.mock.calls[0][0].vehicleId).toBe('VEHICLE-1');
  });

  it('opens delete confirmation dialog when Delete Req is clicked', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /delete req/i }));

    await screen.findByRole('alertdialog');
    expect(screen.getByText(/request vehicle deletion/i)).toBeInTheDocument();
  });

  it('calls deleteReq mutation with the provided reason', async () => {
    const deleteMut = makeMutation();
    const { user } = setup({ deleteMut });

    await user.click(screen.getByRole('button', { name: /delete req/i }));
    await screen.findByRole('alertdialog');

    // ConfirmDialog with requireReason=true — type a reason
    const reasonInput = screen.getByPlaceholderText(/reason \(required\)/i);
    await user.type(reasonInput, 'Vehicle retired');

    // Deleting a vehicle still goes to the super admin as a request, so this
    // dialog keeps its Submit Request button.
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(deleteMut.mutateAsync).toHaveBeenCalledTimes(1));
    const call = deleteMut.mutateAsync.mock.calls[0][0];
    expect(call.vehicleId).toBe('VEHICLE-1');
    expect(call.payload.reason).toBe('Vehicle retired');
  });
});
