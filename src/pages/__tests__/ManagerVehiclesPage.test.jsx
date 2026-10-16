import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ManagerVehiclesPage } from '../ManagerVehiclesPage';

vi.mock('@/hooks/use-vehicles', () => ({
  useManagerVehicles: vi.fn(),
  useManagerAssignableRoutes: vi.fn(),
  useManagerRequests: vi.fn(),
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
  useManagerRequests,
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

async function fillForm(user, { routeMode = 'EXISTING' } = {}) {
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
}

const VEHICLES = [
  {
    _id: 'vehicle-1',
    vehicleId: 'VEHICLE-1',
    vehicleName: 'Shuttle 1',
    numberPlate: 'AB-1234',
    routeId: 'PUB-1',
    // Resolved server-side by GET /api/manager/vehicles (issue #18) — the table
    // no longer derives this from the assignable-routes list.
    routeName: 'Public Route',
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
  vehicles = VEHICLES, routes = ROUTES, requests = [], loading = false, error = null,
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
  useManagerRequests.mockReturnValue({
    data: { data: requests },
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
    expect(screen.getByRole('heading', { level: 1, name: /^vehicles$/i })).toBeInTheDocument();
  });

  it('shows loading skeletons when fetching', () => {
    setup({ loading: true, vehicles: null });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shows error state when vehicles query fails', () => {
    setup({ error: new Error('Server error'), vehicles: null });
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  // The overview page owns the fleet counts; repeating them above the table
  // was removed in the cleanup.
  it('shows no stat cards or page description above the table', () => {
    setup({ vehicles: VEHICLES });
    expect(screen.queryByText('Total Vehicles')).not.toBeInTheDocument();
    expect(screen.queryByText('Active Fleet')).not.toBeInTheDocument();
    expect(screen.queryByText('Inactive Fleet')).not.toBeInTheDocument();
    expect(screen.queryByText(/review managed vehicles/i)).not.toBeInTheDocument();
  });

  it('renders vehicle rows in the table', async () => {
    setup();
    expect(screen.getByText('Shuttle 1')).toBeInTheDocument();
    // Name with the plate beneath it; the internal Vehicle ID lives in the edit dialog.
    expect(screen.getByText('AB-1234')).toBeInTheDocument();
    expect(screen.queryByText('VEHICLE-1')).not.toBeInTheDocument();
  });

  it('labels the row actions as icon buttons', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Edit vehicle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request deletion' })).toBeInTheDocument();
    expect(screen.queryByText('Delete Req')).not.toBeInTheDocument();
  });

  it('shows empty state when no vehicles', () => {
    setup({ vehicles: [] });
    expect(screen.getByText(/no vehicles yet/i)).toBeInTheDocument();
  });

  // Issue #67: the table used to show the raw route code with no lookup,
  // inconsistent with the friendly "name (code)" label the route pickers use.
  // Issue #18: the name now comes from the vehicle row itself (resolved by
  // GET /api/manager/vehicles), not a lookup against the assignable-routes list.
  it('resolves the route column to a friendly name (code), not the raw route id', () => {
    setup(); // VEHICLES[0] carries routeId 'PUB-1' + routeName 'Public Route'
    expect(screen.getByText('Public Route (PUB-1)')).toBeInTheDocument();
    expect(screen.queryByText('PUB-1')).not.toBeInTheDocument();
  });

  it('falls back to the raw route id when the backend could not resolve a route name', () => {
    const orphanVehicle = { ...VEHICLES[0], routeId: 'ORPHAN-ROUTE', routeName: null };
    setup({ vehicles: [orphanVehicle] });
    expect(screen.getByText('ORPHAN-ROUTE')).toBeInTheDocument();
  });

  // Issue #18: the routes list is only needed once a dialog with a route
  // picker is actually open — not on every page visit.
  it('does not fetch the assignable-routes list until a dialog needing it is open', () => {
    setup();
    expect(useManagerAssignableRoutes).toHaveBeenCalledWith({ enabled: false });
  });

  it('fetches the assignable-routes list once the add-vehicle dialog opens', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');
    expect(useManagerAssignableRoutes).toHaveBeenLastCalledWith({ enabled: true });
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

    await fillForm(user, { routeMode: 'CUSTOM' });

    // The default fixture manager already has a vehicle, so this submits as a
    // request rather than an immediate creation — see the label toggle test.
    await user.click(screen.getByRole('button', { name: /create vehicle|submit request/i }));

    await waitFor(() => expect(createMut.mutateAsync).toHaveBeenCalledTimes(1), { timeout: 15000 });
    const payload = createMut.mutateAsync.mock.calls[0][0];
    expect(payload.routeMode).toBe('CUSTOM');
    expect(payload.routeId).toBe('');
  }, 20000);

  it('will not submit a plate that is not Sri Lankan', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');
    await user.type(screen.getByLabelText(/vehicle id/i), 'VEHICLE-98');
    await user.type(screen.getByLabelText(/vehicle name/i), 'Shuttle 98');
    // Three digits where a plate needs four.
    await user.type(screen.getByLabelText(/number plate/i), 'ABC-123');
    await user.click(screen.getByRole('button', { name: /create vehicle|submit request/i }));

    expect(await screen.findByText(/Sri Lankan number plate/i)).toBeInTheDocument();
    expect(createMut.mutateAsync).not.toHaveBeenCalled();
  }, 20000);

  it('will not submit a Vehicle ID already in the fleet (issue #49)', async () => {
    const createMut = makeMutation();
    const { user } = setup({ vehicles: VEHICLES, createMut }); // VEHICLES[0].vehicleId === 'VEHICLE-1'

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');
    // Case-insensitive duplicate of the existing vehicle's ID.
    await user.type(screen.getByLabelText(/vehicle id/i), 'vehicle-1');
    await user.type(screen.getByLabelText(/number plate/i), 'ABC-1234');
    await user.click(screen.getByRole('button', { name: /create vehicle|submit request/i }));

    expect(await screen.findByText(/already in use/i)).toBeInTheDocument();
    expect(createMut.mutateAsync).not.toHaveBeenCalled();
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

  it('does not require a routeId to submit in Custom mode', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });

    await fillForm(user, { routeMode: 'CUSTOM' });
    await user.click(screen.getByRole('button', { name: /create vehicle|submit request/i }));

    await waitFor(() => expect(createMut.mutateAsync).toHaveBeenCalledTimes(1));
  });

  it('submits routeMode EXISTING with the selected routeId by default', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });

    await fillForm(user, { routeMode: 'EXISTING' });

    // The default fixture manager already has a vehicle, so this submits as a
    // request rather than an immediate creation — see the label toggle test.
    await user.click(screen.getByRole('button', { name: /create vehicle|submit request/i }));

    await waitFor(() => expect(createMut.mutateAsync).toHaveBeenCalledTimes(1), { timeout: 15000 });
    const payload = createMut.mutateAsync.mock.calls[0][0];
    expect(payload.routeMode).toBe('EXISTING');
    expect(payload.routeId).toBe('PUB-1');
  }, 20000);

  it('shows a validation error when required fields are empty', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');

    // Submit without filling anything
    await user.click(screen.getByRole('button', { name: /create vehicle|submit request/i }));
    expect(screen.getByText(/please complete/i)).toBeInTheDocument();
  });

  it('collects no driver details and points to the Drivers page instead', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');

    expect(screen.queryByLabelText(/driver name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/initial password/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /drivers page/i })).toHaveAttribute('href', '/manager/accounts');
  });
});

// ----------------------------------------------------------------
// Required-field indicators (issue #11)
// ----------------------------------------------------------------
describe('ManagerVehiclesPage required-field indicators', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('marks Vehicle ID and Number Plate as required in the create dialog, not Vehicle Name', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    const dialog = await screen.findByRole('dialog');

    expect(screen.getByLabelText(/vehicle id/i)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/number plate/i)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/vehicle name/i)).not.toHaveAttribute('aria-required');

    // Existing substring label queries must still resolve to exactly one field —
    // the asterisk lives in a sibling span, not folded into the <label> text, so
    // matching stays unambiguous. Scoped to the dialog: the table underneath has
    // its own "Vehicle ID" column-sort button still in the DOM.
    expect(within(dialog).getByText('Vehicle ID').textContent).toBe('Vehicle ID');
    const marker = within(dialog).getByText('Vehicle ID').nextSibling;
    expect(marker).toHaveTextContent('*');
  });

  it('marks Number Plate as required in the edit dialog', async () => {
    const { user } = setup({ vehicles: VEHICLES });
    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    expect(screen.getByLabelText(/number plate/i)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/vehicle name/i)).not.toHaveAttribute('aria-required');
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

  it('opens delete confirmation dialog when Request deletion is clicked', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Request deletion' }));

    await screen.findByRole('alertdialog');
    expect(screen.getByText(/request vehicle deletion/i)).toBeInTheDocument();
  });

  it('calls deleteReq mutation with the provided reason', async () => {
    const deleteMut = makeMutation();
    const { user } = setup({ deleteMut });

    await user.click(screen.getByRole('button', { name: 'Request deletion' }));
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

    await user.click(screen.getByRole('button', { name: 'Request deletion' }));
    await screen.findByRole('alertdialog');

    const reasonInput = screen.getByPlaceholderText(/reason \(required\)/i);
    await user.type(reasonInput, 'Vehicle retired');
    await user.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(deleteMut.mutateAsync).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/server unavailable/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/reason \(required\)/i)).toHaveValue('Vehicle retired');
  });

  it('shows a pending-deletion indicator when a DELETE_VEHICLE request is outstanding (issue #66)', () => {
    setup({
      requests: [
        { vehicleId: 'VEHICLE-1', type: 'DELETE_VEHICLE', status: 'PENDING' },
      ],
    });
    expect(screen.getByText('Deletion pending')).toBeInTheDocument();
  });

  it('shows no pending-deletion indicator once the request is no longer PENDING', () => {
    setup({
      requests: [
        { vehicleId: 'VEHICLE-1', type: 'DELETE_VEHICLE', status: 'APPROVED' },
      ],
    });
    expect(screen.queryByText('Deletion pending')).not.toBeInTheDocument();
  });

  it('does not show a pending-deletion indicator for a request against a different vehicle or type', () => {
    setup({
      requests: [
        { vehicleId: 'VEHICLE-99', type: 'DELETE_VEHICLE', status: 'PENDING' },
        { vehicleId: 'VEHICLE-1', type: 'CREATE_VEHICLE_ACCOUNT', status: 'PENDING' },
      ],
    });
    expect(screen.queryByText('Deletion pending')).not.toBeInTheDocument();
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
        data: { vehicle: { vehicleId: 'VEHICLE-99' }, driver: null },
      }),
    });
    const { user } = setup({ vehicles: [], createMut });

    await fillForm(user, { routeMode: 'CUSTOM' });

    // With no vehicles yet, the dialog offers immediate creation, not a request.
    expect(screen.queryByText(/sent to a super admin for approval/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^create vehicle$/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^create vehicle$/i }));

    await waitFor(() => expect(createMut.mutateAsync).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith('Vehicle created');
  }, 20000);

  it('submits a request instead of creating when the manager already has a vehicle', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({
        data: { _id: 'req-1', type: 'CREATE_VEHICLE_ACCOUNT', status: 'PENDING' },
      }),
    });
    const { user } = setup({ vehicles: VEHICLES, createMut });

    await fillForm(user, { routeMode: 'CUSTOM' });

    // Already has a vehicle, so the dialog says this one is a request.
    expect(screen.getByText(/not your first vehicle.*sent to a super admin for approval/i))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^submit request$/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^submit request$/i }));

    await waitFor(() => expect(createMut.mutateAsync).toHaveBeenCalledTimes(1));
    // Not the immediate-creation toast — the request went to a super admin instead.
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/submitted for super admin approval/i));
  }, 20000);
});

// ----------------------------------------------------------------
// Discard confirmation on accidental dismissal (issue #8)
// ----------------------------------------------------------------
describe('ManagerVehiclesPage create-dialog discard confirmation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('closes immediately without prompting when Escape is pressed on an untouched form', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('prompts to discard on Escape once the form has unsaved data, keeping the dialog and data on Cancel', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');
    await user.type(screen.getByLabelText(/vehicle id/i), 'VEHICLE-99');

    await user.keyboard('{Escape}');

    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('Discard changes?')).toBeInTheDocument();
    // The add-vehicle dialog and its typed data are still there underneath —
    // `hidden: true` because Radix marks background content aria-hidden while
    // the discard prompt is on top of it, not because it was actually closed.
    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
    expect(screen.getByLabelText(/vehicle id/i)).toHaveValue('VEHICLE-99');

    await user.click(within(confirm).getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText(/vehicle id/i)).toHaveValue('VEHICLE-99');
  });

  it('discards the form and closes the dialog when the discard prompt is confirmed', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');
    await user.type(screen.getByLabelText(/vehicle id/i), 'VEHICLE-99');

    await user.keyboard('{Escape}');
    const confirm = await screen.findByRole('alertdialog');

    await user.click(within(confirm).getByRole('button', { name: /^discard$/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('discards immediately via the explicit Cancel button, without a prompt', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');
    await user.type(screen.getByLabelText(/vehicle id/i), 'VEHICLE-99');

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

// ----------------------------------------------------------------
// Misc edge-case gaps (issue #27)
// ----------------------------------------------------------------
describe('ManagerVehiclesPage misc edge cases (issue #27)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('reopening the create dialog after closing partway through starts fresh, not with stale data', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');
    await user.type(screen.getByLabelText(/vehicle id/i), 'STALE-ID');
    await user.type(screen.getByLabelText(/vehicle name/i), 'Stale Name');

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');

    expect(screen.getByLabelText(/vehicle id/i)).toHaveValue('');
    expect(screen.getByLabelText(/vehicle name/i)).toHaveValue('');
  });

  it('switching Existing → Custom → Existing within one open dialog does not carry over a stale route selection', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));
    await screen.findByRole('dialog');

    await chooseOption(user, /^route$/i, /Public Route/i);
    expect(screen.getByRole('combobox', { name: /^route$/i })).toHaveTextContent('Public Route');

    await user.click(screen.getByLabelText(/custom route/i));
    expect(screen.queryByRole('combobox', { name: /^route$/i })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/^existing route$/i));
    // Back on Existing, the earlier pick isn't silently retained — the
    // handler clears routeId whenever routeMode changes away from EXISTING,
    // so switching away and back leaves the picker unset.
    expect(screen.getByRole('combobox', { name: /^route$/i })).toHaveTextContent(/select a route/i);

    // And it's still fully usable after the round trip.
    await chooseOption(user, /^route$/i, /Second Route/i);
    expect(screen.getByRole('combobox', { name: /^route$/i })).toHaveTextContent('Second Route');
  });

  it('disables the submit button before a second rapid click can fire a duplicate create request', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(() => new Promise(() => {})); // never resolves; only the call count matters

    useManagerVehicles.mockReturnValue({
      data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn(),
    });
    useManagerAssignableRoutes.mockReturnValue({ data: { data: ROUTES }, isLoading: false });
    useManagerRequests.mockReturnValue({ data: { data: [] }, isLoading: false });
    useUpdateManagerVehicle.mockReturnValue(makeMutation());
    useRequestDeleteVehicle.mockReturnValue(makeMutation());
    // A static mock never flips `isPending`, so this needs to behave like the
    // real mutation hook: pending state that actually changes on submit and
    // re-renders the button's `disabled` prop with it.
    useCreateManagerVehicle.mockImplementation(() => {
      const [isPending, setIsPending] = useState(false);
      return {
        isPending,
        mutateAsync: (payload) => {
          setIsPending(true);
          return mutateAsync(payload);
        },
      };
    });

    render(<MemoryRouter><ManagerVehiclesPage /></MemoryRouter>);

    await fillForm(user, { routeMode: 'CUSTOM' });

    const submitBtn = screen.getByRole('button', { name: /create vehicle|submit request/i });
    await user.dblClick(submitBtn);

    expect(mutateAsync).toHaveBeenCalledTimes(1);
  }, 20000);

  it('shows a clear "already exists" message on a 409 duplicate-vehicle-id conflict from the server (issue #26)', async () => {
    const conflict = Object.assign(new Error('A vehicle with this ID already exists'), { status: 409 });
    const createMut = makeMutation({ mutateAsync: vi.fn().mockRejectedValue(conflict) });
    const { user } = setup({ createMut });

    await fillForm(user, { routeMode: 'CUSTOM' });
    await user.click(screen.getByRole('button', { name: /create vehicle|submit request/i }));

    expect(await screen.findByText('A vehicle with this ID already exists')).toBeInTheDocument();
  }, 20000);

  it('shows the server\'s specific "not found" message, not a generic error, when saving an edit for a vehicle deleted in the background', async () => {
    const notFound = Object.assign(new Error('Vehicle not found'), { status: 404 });
    const updateMut = makeMutation({ mutateAsync: vi.fn().mockRejectedValue(notFound) });
    const { user } = setup({ updateMut });

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('Vehicle not found')).toBeInTheDocument();
    expect(screen.queryByText(/an error occurred|request failed/i)).not.toBeInTheDocument();
  });
});
