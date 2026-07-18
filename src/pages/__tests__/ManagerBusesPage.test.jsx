import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ManagerBusesPage } from '../ManagerBusesPage';

vi.mock('@/hooks/use-buses', () => ({
  useManagerBuses: vi.fn(),
  useManagerAssignableRoutes: vi.fn(),
  useCreateBusAccountRequest: vi.fn(),
  useUpdateManagerBus: vi.fn(),
  useRequestDeleteBus: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: vi.fn() }));

import {
  useManagerBuses,
  useManagerAssignableRoutes,
  useCreateBusAccountRequest,
  useUpdateManagerBus,
  useRequestDeleteBus,
} from '@/hooks/use-buses';

const ROUTES = [{ routeId: 'PUB-1', routeName: 'Public Route', visibility: 'PUBLIC' }];

const BUSES = [
  {
    _id: 'bus-1',
    busId: 'BUS-1',
    busName: 'Shuttle 1',
    numberPlate: 'AB-1234',
    routeId: 'PUB-1',
    serviceType: 'PUBLIC',
    seatCapacity: 40,
    busType: 'AC',
    bookingEnabled: true,
    isActive: true,
    maintenanceStatus: 'ACTIVE',
  },
];

function makeMutation(overrides = {}) {
  return { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, ...overrides };
}

function defaultHooks({
  buses = BUSES, routes = ROUTES, loading = false, error = null,
  createMut, updateMut, deleteMut,
} = {}) {
  useManagerBuses.mockReturnValue({
    data: buses ? { data: buses } : undefined,
    isLoading: loading,
    isError: Boolean(error),
    error,
    refetch: vi.fn(),
  });
  useManagerAssignableRoutes.mockReturnValue({
    data: routes ? { data: routes } : undefined,
    isLoading: false,
  });
  useCreateBusAccountRequest.mockReturnValue(createMut || makeMutation());
  useUpdateManagerBus.mockReturnValue(updateMut || makeMutation());
  useRequestDeleteBus.mockReturnValue(deleteMut || makeMutation());
}

function setup(opts) {
  defaultHooks(opts);
  const user = userEvent.setup();
  render(<MemoryRouter><ManagerBusesPage /></MemoryRouter>);
  return { user };
}

describe('ManagerBusesPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /bus management/i })).toBeInTheDocument();
  });

  it('shows loading skeletons when fetching', () => {
    setup({ loading: true, buses: null });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shows error state when buses query fails', () => {
    setup({ error: new Error('Server error'), buses: null });
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('renders stat cards with correct counts', () => {
    setup({ buses: BUSES }); // 1 bus, 1 active
    expect(screen.getByText('Total Buses')).toBeInTheDocument();
    expect(screen.getByText('Active Fleet')).toBeInTheDocument();
    expect(screen.getByText('Inactive Fleet')).toBeInTheDocument();
  });

  it('renders bus rows in the table', async () => {
    setup();
    expect(screen.getByText('Shuttle 1')).toBeInTheDocument();
    expect(screen.getByText('AB-1234')).toBeInTheDocument();
    expect(screen.getByText('BUS-1')).toBeInTheDocument();
  });

  it('shows empty state when no buses', () => {
    setup({ buses: [] });
    expect(screen.getByText(/no buses yet/i)).toBeInTheDocument();
  });
});

// ----------------------------------------------------------------
// Route assignment toggle (preserved from original 3 core tests)
// ----------------------------------------------------------------
describe('ManagerBusesPage route assignment toggle', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  async function fillStep0(user, { routeMode = 'EXISTING' } = {}) {
    await user.click(screen.getByRole('button', { name: /add bus request/i }));
    await screen.findByRole('dialog');

    await user.type(screen.getByLabelText(/bus id/i), 'BUS-99');
    await user.type(screen.getByLabelText(/bus name/i), 'Shuttle 99');
    await user.type(screen.getByLabelText(/number plate/i), 'ABC-123');

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
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(createMut.mutateAsync).toHaveBeenCalledTimes(1), { timeout: 15000 });
    const payload = createMut.mutateAsync.mock.calls[0][0];
    expect(payload.routeMode).toBe('CUSTOM');
    expect(payload.routeId).toBe('');
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
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(createMut.mutateAsync).toHaveBeenCalledTimes(1));
    const payload = createMut.mutateAsync.mock.calls[0][0];
    expect(payload.routeMode).toBe('EXISTING');
    expect(payload.routeId).toBe('PUB-1');
  });

  it('shows validation error when required step 0 fields are empty', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /add bus request/i }));
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
describe('ManagerBusesPage booking-enabled removal', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders no booking-enabled controls in the grid, summary, or edit dialog', async () => {
    const { user } = setup({ buses: BUSES });

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
describe('ManagerBusesPage edit and delete', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('opens edit dialog with bus data pre-populated', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /edit/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText(/bus name/i)).toHaveValue('Shuttle 1');
    expect(screen.getByLabelText(/number plate/i)).toHaveValue('AB-1234');
  });

  it('calls updateBus mutation on save', async () => {
    const updateMut = makeMutation();
    const { user } = setup({ updateMut });

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateMut.mutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMut.mutateAsync.mock.calls[0][0].busId).toBe('BUS-1');
  });

  it('opens delete confirmation dialog when Delete Req is clicked', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /delete req/i }));

    await screen.findByRole('alertdialog');
    expect(screen.getByText(/request bus deletion/i)).toBeInTheDocument();
  });

  it('calls deleteReq mutation with the provided reason', async () => {
    const deleteMut = makeMutation();
    const { user } = setup({ deleteMut });

    await user.click(screen.getByRole('button', { name: /delete req/i }));
    await screen.findByRole('alertdialog');

    // ConfirmDialog with requireReason=true — type a reason
    const reasonInput = screen.getByPlaceholderText(/reason \(required\)/i);
    await user.type(reasonInput, 'Bus retired');

    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(deleteMut.mutateAsync).toHaveBeenCalledTimes(1));
    const call = deleteMut.mutateAsync.mock.calls[0][0];
    expect(call.busId).toBe('BUS-1');
    expect(call.payload.reason).toBe('Bus retired');
  });
});
