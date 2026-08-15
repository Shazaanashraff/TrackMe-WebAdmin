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

// The page reads the organization list for its category selects.
vi.mock('@/hooks/use-drivers', () => ({
  useOrganizations: vi.fn(() => ({ data: { data: [] }, isLoading: false })),
}));

vi.mock('sonner', () => ({ toast: vi.fn() }));

import {
  useManagerVehicles,
  useManagerAssignableRoutes,
  useCreateManagerVehicle,
  useUpdateManagerVehicle,
  useRequestDeleteVehicle,
} from '@/hooks/use-vehicles';
import { toast } from 'sonner';

const ROUTES = [
  { routeId: 'PUB-1', routeName: 'Public Route', visibility: 'PUBLIC' },
  { routeId: 'PUB-2', routeName: 'Second Route', visibility: 'PUBLIC' },
];

// The Radix select trigger is a button; picking an option is click-trigger,
// click-option.
async function chooseOption(user, triggerName, optionName) {
  await user.click(screen.getByRole('combobox', { name: triggerName }));
  await user.click(await screen.findByRole('option', { name: optionName }));
}

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

  it('submits routeMode CUSTOM and no routeId when the Custom Route option is chosen', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });

    await fillStep0(user, { routeMode: 'CUSTOM' });

    // Step 1 is the driver, which a vehicle can go without.
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2: submit
    // The default fixture manager already has a vehicle, so this submits as a
    // request rather than an immediate creation — see the label toggle test.
    await user.click(screen.getByRole('button', { name: /create vehicle|submit request/i }));

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

  it('will not advance past step 0 with a Vehicle ID already in the fleet (issue #49)', async () => {
    const { user } = setup({ vehicles: VEHICLES }); // VEHICLES[0].vehicleId === 'VEHICLE-1'

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');
    // Case-insensitive duplicate of the existing vehicle's ID.
    await user.type(screen.getByLabelText(/vehicle id/i), 'vehicle-1');
    await user.type(screen.getByLabelText(/number plate/i), 'ABC-1234');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText(/already in use/i)).toBeInTheDocument();
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

    // Step 1, left blank: the vehicle is created unassigned.
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2
    // The default fixture manager already has a vehicle, so this submits as a
    // request rather than an immediate creation — see the label toggle test.
    await user.click(screen.getByRole('button', { name: /create vehicle|submit request/i }));

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

  it('lets the whole driver step be skipped, leaving the vehicle unassigned', async () => {
    const { user } = setup();

    await fillStep0(user, { routeMode: 'CUSTOM' });
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Reached the review step rather than being held back, and it says the
    // vehicle is going in without a driver.
    expect(screen.getByRole('button', { name: /create vehicle|submit request/i })).toBeInTheDocument();
    expect(screen.getAllByText(/unassigned/i).length).toBeGreaterThan(0);
  }, 20000);

  it('asks for a password once a driver is named', async () => {
    const { user } = setup();

    await fillStep0(user, { routeMode: 'CUSTOM' });
    await user.type(screen.getByLabelText(/driver name/i), 'Kamal');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText(/a driver needs an initial password/i)).toBeInTheDocument();
  }, 20000);

  it('will not take a password with nobody to give it to', async () => {
    const { user } = setup();

    await fillStep0(user, { routeMode: 'CUSTOM' });
    await user.type(screen.getByLabelText(/initial password/i), 'Sup3rSecret!');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText(/name the driver this password belongs to/i)).toBeInTheDocument();
  }, 20000);
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

  it('uses the same validated route dropdown as the create form, not free text (issue #13)', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    expect(screen.queryByLabelText(/route id/i)).toBeNull();
    expect(screen.getByRole('combobox', { name: /route/i })).toHaveTextContent('Public Route');
  });

  it('sends the newly-picked route when the edit dropdown selection changes', async () => {
    const updateMut = makeMutation();
    const { user } = setup({ updateMut });
    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    await chooseOption(user, /route/i, /second route/i);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateMut.mutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMut.mutateAsync.mock.calls[0][0].payload.routeId).toBe('PUB-2');
  });

  it('keeps a route not in the assignable list visible as the current selection instead of blanking it', async () => {
    const orphanVehicle = { ...VEHICLES[0], routeId: 'ORPHAN-ROUTE' };
    const { user } = setup({ vehicles: [orphanVehicle] });
    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    expect(screen.getByRole('combobox', { name: /route/i })).toHaveTextContent('ORPHAN-ROUTE');
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

  it('rejects an invalid plate format on save, same message as create, without submitting (issue #41)', async () => {
    const updateMut = makeMutation();
    const { user } = setup({ updateMut });

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    const plateInput = screen.getByLabelText(/number plate/i);
    await user.clear(plateInput);
    await user.type(plateInput, 'NOTAPLATE');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/enter a sri lankan number plate/i)).toBeInTheDocument();
    expect(updateMut.mutateAsync).not.toHaveBeenCalled();
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

  it('keeps the confirm dialog open and shows the error inline when the delete request fails (issue #48)', async () => {
    const deleteMut = makeMutation({ mutateAsync: vi.fn().mockRejectedValue(new Error('Server unavailable')) });
    const { user } = setup({ deleteMut });

    await user.click(screen.getByRole('button', { name: /delete req/i }));
    await screen.findByRole('alertdialog');

    const reasonInput = screen.getByPlaceholderText(/reason \(required\)/i);
    await user.type(reasonInput, 'Vehicle retired');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(deleteMut.mutateAsync).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/server unavailable/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/reason \(required\)/i)).toHaveValue('Vehicle retired');
  });
});

// ----------------------------------------------------------------
// Create: a manager's first vehicle is immediate, later ones are a request
// (backend/src/controllers/managerController.js — bootstrap rule)
// ----------------------------------------------------------------
describe('ManagerVehiclesPage create — bootstrap vs request', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates the vehicle immediately when the manager has no vehicles yet', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({
        data: { vehicle: { vehicleId: 'VEHICLE-99' }, driver: { driverCode: 'DRV-1234-5678' } },
      }),
    });
    const { user } = setup({ vehicles: [], createMut });

    await fillStep0(user, { routeMode: 'CUSTOM' });
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // With no vehicles yet, the review step offers immediate creation, not a request.
    expect(screen.getByText(/this is your first vehicle, so it will be created right away/i))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^create vehicle$/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^create vehicle$/i }));

    await waitFor(() => expect(createMut.mutateAsync).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/vehicle created.*driver id/i));
  }, 20000);

  it('submits a request instead of creating when the manager already has a vehicle', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({
        data: { _id: 'req-1', type: 'CREATE_VEHICLE_ACCOUNT', status: 'PENDING' },
      }),
    });
    const { user } = setup({ vehicles: VEHICLES, createMut });

    await fillStep0(user, { routeMode: 'CUSTOM' });
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Already has a vehicle, so the review step says this one is a request.
    expect(screen.getByText(/not your first vehicle.*submitted for super admin approval/i))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^submit request$/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^submit request$/i }));

    await waitFor(() => expect(createMut.mutateAsync).toHaveBeenCalledTimes(1));
    // Not the immediate-creation toast — the request went to a super admin instead.
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/submitted for super admin approval/i));
    expect(toast).not.toHaveBeenCalledWith(expect.stringMatching(/driver id/i));
  }, 20000);
});
