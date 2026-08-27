import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ManagerAccountsPage } from '../ManagerAccountsPage';

vi.mock('@/hooks/use-drivers', () => ({
  useOrganizations: vi.fn(),
  useManagerDrivers: vi.fn(),
  useCreateDriver: vi.fn(),
  useUpdateDriver: vi.fn(),
  useDeleteDriver: vi.fn(),
  useResetDriverPassword: vi.fn(),
  useDriverPassword: vi.fn(),
  useDriverEnrollmentKey: vi.fn(),
  useRotateDriverEnrollmentKey: vi.fn(),
  useRevertDriverEnrollmentKey: vi.fn(),
}));

// The directory reads the fleet snapshot for its Location column, but never
// opens a socket: only the tracking page follows a vehicle.
vi.mock('@/hooks/use-tracking', async (importOriginal) => ({
  ...(await importOriginal()),
  useManagerFleetLive: vi.fn(),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

vi.mock('sonner', () => ({ toast: vi.fn() }));

vi.mock('@/hooks/use-online-status', () => ({ useOnlineStatus: vi.fn(() => true) }));

import { toast } from 'sonner';
import { useManagerFleetLive } from '@/hooks/use-tracking';
import { useOnlineStatus } from '@/hooks/use-online-status';

import {
  useOrganizations,
  useManagerDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
  useResetDriverPassword,
  useDriverPassword,
  useDriverEnrollmentKey,
  useRotateDriverEnrollmentKey,
  useRevertDriverEnrollmentKey,
} from '@/hooks/use-drivers';

const ORGANIZATIONS = [
  { _id: 'org-1', name: 'Royal College', serviceType: 'SCHOOL' },
  { _id: 'org-2', name: 'St. Peters', serviceType: 'SCHOOL' },
];

const DRIVERS = [
  {
    _id: 'driver-1',
    driverCode: 'DRV-4K7P-9XQ2',
    name: 'Kamal Perera',
    email: 'kamal@t.com',
    organization: { _id: 'org-1', name: 'Royal College', serviceType: 'SCHOOL' },
    phoneNumber: '0771234567',
    isActive: true,
    setupComplete: true,
    vehicle: { _id: 'v1', vehicleId: 'BUS-1', numberPlate: 'AB-1234' },
  },
  {
    // A driver created without an email, signing in with the ID alone.
    _id: 'driver-2',
    driverCode: 'DRV-8H2N-5TRW',
    name: 'Sunil Silva',
    email: '',
    organization: null,
    phoneNumber: '',
    isActive: true,
    setupComplete: false,
    vehicle: null,
  },
];

function makeMutation(overrides = {}) {
  return { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, ...overrides };
}

// useDriverEnrollmentKey is now a query (per row, enabled on "Show key"), not a
// shared mutation. Default: nothing cached, so every row shows "Show key".
function makeKeyQuery(overrides = {}) {
  return { data: undefined, isError: false, isFetching: false, error: null, refetch: vi.fn(), ...overrides };
}
const keyQueryWith = (enrollmentKey, canRevert = true) =>
  makeKeyQuery({ data: { success: true, data: { enrollmentKey, canRevert } } });

// One record per fleet vehicle, exactly as GET /api/manager/vehicles/live
// returns it: the driver is named on the record, which is how a row finds its
// own position.
const liveRecord = (overrides = {}) => ({
  vehicleId: 'BUS-1',
  live: true,
  location: { lat: 6.9271, lng: 79.8612, receivedAt: new Date().toISOString() },
  vehicle: { vehicleId: 'BUS-1', numberPlate: 'AB-1234' },
  driver: { _id: 'driver-1', name: 'Kamal Perera' },
  ...overrides,
});

function defaultHooks({
  drivers = DRIVERS,
  organizations = ORGANIZATIONS,
  fleet = [],
  online = true,
  createMut,
  updateMut,
  viewPwMut,
  keyQuery,
  rotateMut,
  revertMut,
} = {}) {
  useManagerDrivers.mockReturnValue({
    data: { data: drivers }, isLoading: false, error: null, refetch: vi.fn(),
  });
  useOrganizations.mockReturnValue({ data: { data: organizations }, isLoading: false });
  useManagerFleetLive.mockReturnValue({ data: { data: fleet }, isLoading: false, error: null });
  useOnlineStatus.mockReturnValue(online);
  useCreateDriver.mockReturnValue(createMut || makeMutation());
  useUpdateDriver.mockReturnValue(updateMut || makeMutation());
  useDeleteDriver.mockReturnValue(makeMutation());
  useResetDriverPassword.mockReturnValue(makeMutation());
  useDriverPassword.mockReturnValue(viewPwMut || makeMutation());
  // keyQuery may be a single object (same for every row) or a (driverId) => object.
  if (typeof keyQuery === 'function') {
    useDriverEnrollmentKey.mockImplementation((driverId) => keyQuery(driverId));
  } else {
    useDriverEnrollmentKey.mockReturnValue(keyQuery || makeKeyQuery());
  }
  useRotateDriverEnrollmentKey.mockReturnValue(rotateMut || makeMutation());
  useRevertDriverEnrollmentKey.mockReturnValue(revertMut || makeMutation());
}

function setup(opts) {
  defaultHooks(opts);
  const user = userEvent.setup();
  render(<MemoryRouter><ManagerAccountsPage /></MemoryRouter>);
  return { user };
}

const openForm = async (user) => user.click(screen.getByRole('button', { name: /add driver/i }));

// The Radix select trigger is a button; picking an option is click-trigger,
// click-option.
async function chooseOption(user, triggerName, optionName) {
  await user.click(screen.getByRole('combobox', { name: triggerName }));
  await user.click(await screen.findByRole('option', { name: optionName }));
}

describe('ManagerAccountsPage: driver directory', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows the driver ID and organization for each driver', () => {
    setup();

    expect(screen.getByText('DRV-4K7P-9XQ2')).toBeInTheDocument();
    expect(screen.getByText('Royal College')).toBeInTheDocument();
  });

  it('names the empty state rather than leaving a blank cell', () => {
    setup({ drivers: [DRIVERS[1]] });

    expect(screen.getByText('DRV-8H2N-5TRW')).toBeInTheDocument();
    // Email, organization and phone are all empty for this driver. Written out
    // as words: the UI carries no em dashes.
    expect(screen.getAllByText('None').length).toBeGreaterThanOrEqual(3);
  });

  it('identifies the vehicle by its plate alone, not its internal ID', () => {
    setup();

    expect(screen.getByText('AB-1234')).toBeInTheDocument();
    expect(screen.queryByText(/BUS-1/)).not.toBeInTheDocument();
  });

  it('falls back to the vehicle ID when a record carries no plate', () => {
    const noPlate = { ...DRIVERS[0], vehicle: { _id: 'v9', vehicleId: 'BUS-9' } };
    setup({ drivers: [noPlate] });

    expect(screen.getByText('BUS-9')).toBeInTheDocument();
  });

  it('names the empty vehicle cell rather than leaving it blank', () => {
    setup({ drivers: [{ ...DRIVERS[0], vehicle: null }] });

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });
});

describe('ManagerAccountsPage: location column', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const trackButton = (name = 'Kamal Perera') =>
    screen.queryByRole('button', { name: `Track ${name} on the live map` });

  it('marks a broadcasting driver live and opens their vehicle on the map', async () => {
    const { user } = setup({ drivers: [DRIVERS[0]], fleet: [liveRecord()] });

    expect(screen.getByText('Live')).toBeInTheDocument();
    await user.click(trackButton());

    // The map is addressed by vehicle, since that is what the tracking page
    // and the socket subscribe to.
    expect(navigate).toHaveBeenCalledWith('/manager/tracking?vehicle=BUS-1');
  });

  // live:true with an old fix is the backend's sweeper lagging, not a
  // position worth trusting silently — but it is still worth opening.
  it('marks a driver stale when the last fix is older than the stale window', async () => {
    const stale = new Date(Date.now() - 5 * 60_000).toISOString();
    const { user } = setup({
      drivers: [DRIVERS[0]],
      fleet: [liveRecord({ location: { lat: 6.9, lng: 79.8, receivedAt: stale } })],
    });

    expect(screen.getByText('Stale')).toBeInTheDocument();
    await user.click(trackButton());
    expect(navigate).toHaveBeenCalledWith('/manager/tracking?vehicle=BUS-1');
  });

  it('offers no map link for a driver who is not broadcasting', () => {
    setup({ drivers: [DRIVERS[0]], fleet: [liveRecord({ live: false, location: null })] });

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(trackButton()).not.toBeInTheDocument();
  });

  it('treats a driver missing from the fleet snapshot as offline', () => {
    setup({ drivers: [DRIVERS[0]], fleet: [] });

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(trackButton()).not.toBeInTheDocument();
  });

  it('says there is nothing to track when the driver has no vehicle', () => {
    setup({ drivers: [DRIVERS[1]], fleet: [] });

    expect(screen.getByText('No vehicle')).toBeInTheDocument();
    expect(trackButton('Sunil Silva')).not.toBeInTheDocument();
  });
});

describe('ManagerAccountsPage: enrollment key rotation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const openRowMenu = (user, name = 'Kamal Perera') =>
    user.click(screen.getByRole('button', { name: `Actions for ${name}` }));

  const rotated = (canRevert = true) => makeMutation({
    mutateAsync: vi.fn().mockResolvedValue({ data: { enrollmentKey: 'TMD-NEW-KEY-0001', canRevert } }),
  });

  it('warns before rotating instead of rotating on the click itself', async () => {
    const rotateMut = rotated();
    const { user } = setup({ rotateMut });

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /replace enrollment key/i }));

    // The menu click opens the warning; nothing has been rotated yet.
    expect(rotateMut.mutateAsync).not.toHaveBeenCalled();
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });

  it('says what rotating will do to the key already handed out', async () => {
    const { user } = setup({ rotateMut: rotated() });

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /replace enrollment key/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/stops working straight away/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/undo this once/i)).toBeInTheDocument();
  });

  it('rotates nothing when the manager backs out', async () => {
    const rotateMut = rotated();
    const { user } = setup({ rotateMut });

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /replace enrollment key/i }));
    await user.click(await screen.findByRole('button', { name: /cancel/i }));

    expect(rotateMut.mutateAsync).not.toHaveBeenCalled();
  });

  it('rotates once the warning is confirmed', async () => {
    const rotateMut = rotated();
    const { user } = setup({ rotateMut });

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /replace enrollment key/i }));
    await user.click(await screen.findByRole('button', { name: /replace key/i }));

    expect(rotateMut.mutateAsync).toHaveBeenCalledWith({ driverId: 'driver-1' });
  });

  it('offers the undo only after a rotation has happened', async () => {
    const { user } = setup({ rotateMut: rotated() });

    await openRowMenu(user);
    expect(screen.queryByRole('menuitem', { name: /restore previous key/i })).not.toBeInTheDocument();

    await user.click(await screen.findByRole('menuitem', { name: /replace enrollment key/i }));
    await user.click(await screen.findByRole('button', { name: /replace key/i }));

    await openRowMenu(user);
    expect(await screen.findByRole('menuitem', { name: /restore previous key/i })).toBeInTheDocument();
  });

  it('restores the previous key through the undo, then withdraws the offer', async () => {
    const revertMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({ data: { enrollmentKey: 'TMD-OLD-KEY-0001', canRevert: false } }),
    });
    const { user } = setup({ rotateMut: rotated(), revertMut });

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /replace enrollment key/i }));
    await user.click(await screen.findByRole('button', { name: /replace key/i }));

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /restore previous key/i }));

    expect(revertMut.mutateAsync).toHaveBeenCalledWith({ driverId: 'driver-1' });

    // Spent: the server allows one undo per rotation, so the option goes away.
    await openRowMenu(user);
    expect(screen.queryByRole('menuitem', { name: /restore previous key/i })).not.toBeInTheDocument();
  });

  it('offers the undo once a revealed key reports a rotation is still recoverable', async () => {
    // A reveal (from cache, after a page refresh) is how the option comes back.
    const { user } = setup({ keyQuery: keyQueryWith('TMD-CUR-KEY-0001', true) });

    await user.click(screen.getAllByRole('button', { name: /show key/i })[0]);
    expect(await screen.findByText('TMD-CUR-KEY-0001')).toBeInTheDocument();

    await openRowMenu(user);
    expect(await screen.findByRole('menuitem', { name: /restore previous key/i })).toBeInTheDocument();
  });

  it('reveals each row independently — one row\'s key does not open another\'s (issue #68)', async () => {
    // Each row now has its own useDriverEnrollmentKey query + a page-held `shown`
    // flag, so the shared-mutation variable race the issue described can't
    // happen. Per-driver cached keys prove the rows stay independent.
    const { user } = setup({
      keyQuery: (driverId) => keyQueryWith(`TMD-KEY-${driverId}`, true),
    });

    const showButtons = screen.getAllByRole('button', { name: /show key/i });
    expect(showButtons).toHaveLength(2); // DRIVERS fixture has two drivers

    await user.click(showButtons[0]);
    expect(await screen.findByText('TMD-KEY-driver-1')).toBeInTheDocument();
    // The other row is untouched — still offering its own "Show key".
    expect(screen.getAllByRole('button', { name: /show key/i })).toHaveLength(1);
    expect(screen.queryByText('TMD-KEY-driver-2')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show key/i }));
    expect(await screen.findByText('TMD-KEY-driver-2')).toBeInTheDocument();
    // driver-1's key is still shown.
    expect(screen.getByText('TMD-KEY-driver-1')).toBeInTheDocument();
  });

  it('shows a Loading… label while a row\'s key query is fetching', async () => {
    const { user } = setup({ keyQuery: makeKeyQuery({ isFetching: true }) });
    await user.click(screen.getAllByRole('button', { name: /show key/i })[0]);
    expect(await screen.findByText('Loading…')).toBeInTheDocument();
  });
});

describe('ManagerAccountsPage: enrollment key offline (Offline & Caching Audit, chunk 2)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('disables "Show key" offline when the key is not already cached', () => {
    setup({ online: false });
    const btn = screen.getAllByRole('button', { name: /show key/i })[0];
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', "Reconnect to open a key you haven't viewed yet");
  });

  it('opens a key cached from an earlier reveal even while offline', async () => {
    const { user } = setup({ online: false, keyQuery: keyQueryWith('TMD-CACHED-0001') });
    const btn = screen.getAllByRole('button', { name: /show key/i })[0];
    expect(btn).toBeEnabled();
    await user.click(btn);
    expect(await screen.findByText('TMD-CACHED-0001')).toBeInTheDocument();
  });

  it('re-hiding a cached key keeps it re-openable offline', async () => {
    const { user } = setup({ online: false, keyQuery: keyQueryWith('TMD-CACHED-0002') });
    await user.click(screen.getAllByRole('button', { name: /show key/i })[0]);
    expect(await screen.findByText('TMD-CACHED-0002')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide/i }));
    expect(screen.queryByText('TMD-CACHED-0002')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /show key/i })[0]);
    expect(await screen.findByText('TMD-CACHED-0002')).toBeInTheDocument();
  });
});

describe('ManagerAccountsPage: disable driver confirmation (issue #50)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const openRowMenu = (user, name = 'Kamal Perera') =>
    user.click(screen.getByRole('button', { name: `Actions for ${name}` }));

  it('warns before disabling instead of disabling on the click itself', async () => {
    const updateMut = makeMutation();
    const { user } = setup({ updateMut });

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /disable driver/i }));

    expect(updateMut.mutateAsync).not.toHaveBeenCalled();
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });

  it('disables nothing when the manager backs out', async () => {
    const updateMut = makeMutation();
    const { user } = setup({ updateMut });

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /disable driver/i }));
    await user.click(await screen.findByRole('button', { name: /cancel/i }));

    expect(updateMut.mutateAsync).not.toHaveBeenCalled();
  });

  it('disables once the warning is confirmed', async () => {
    const updateMut = makeMutation();
    const { user } = setup({ updateMut });

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /disable driver/i }));
    await user.click(await screen.findByRole('button', { name: /disable driver/i }));

    expect(updateMut.mutateAsync).toHaveBeenCalledWith({
      driverId: 'driver-1',
      payload: { isActive: false },
    });
  });

  it('enables an already-disabled driver immediately, with no confirmation', async () => {
    const updateMut = makeMutation();
    const disabledDriver = { ...DRIVERS[0], isActive: false };
    const { user } = setup({ drivers: [disabledDriver], updateMut });

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /enable driver/i }));

    expect(updateMut.mutateAsync).toHaveBeenCalledWith({
      driverId: 'driver-1',
      payload: { isActive: true },
    });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('ManagerAccountsPage: driver privacy', () => {
  it('creates a public driver unless the manager turns privacy on', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({ data: { _id: 'new-1', name: 'Nimal' } }),
    });
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
    await user.type(screen.getByLabelText(/Vehicle number/i), 'CAB-1234');
    await user.type(screen.getByLabelText(/^Password$/i), 'DriverPass1!');
    await user.click(screen.getByLabelText(/Private driver/i));
    await user.click(screen.getByRole('button', { name: /create driver/i }));

    expect(createMut.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ isPrivate: true })
    );
  });

  it('explains what the toggle changes about the key', async () => {
    const { user } = setup();
    await openForm(user);

    expect(screen.getByText(/enrolled straight away/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Private driver/i));
    expect(screen.getByText(/wait for your approval/i)).toBeInTheDocument();
  });

  it('flags a private driver in the directory', () => {
    setup({
      drivers: [{ ...DRIVERS[0], isPrivate: true }, { ...DRIVERS[1], isPrivate: false }],
    });
    // One badge for the one private driver, not one per row.
    expect(screen.getAllByText('Approval')).toHaveLength(1);
  });
});

describe('ManagerAccountsPage: add driver form', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lays the form out in the three numbered sections', async () => {
    const { user } = setup();
    await openForm(user);

    expect(screen.getByRole('heading', { name: /1 · Driver details/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /2 · Organization/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /3 · Vehicle and app access/i })).toBeInTheDocument();
  });

  it('marks email, NIC and licence as optional and does not call the password temporary', async () => {
    const { user } = setup();
    await openForm(user);

    expect(screen.getByLabelText(/Email \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/NIC number \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Licence card number \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/temporary password/i)).not.toBeInTheDocument();
  });

  it('creates a driver from a name, a vehicle and a password', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({
        data: { _id: 'new-1', name: 'Nimal', email: '', driverCode: 'DRV-1111-2222' },
        enrollmentKey: 'TMD-AAAA-BBBB-CCCC',
      }),
    });
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
    await user.type(screen.getByLabelText(/Vehicle number/i), 'CAB-1234');
    await user.type(screen.getByLabelText(/^Password$/i), 'DriverPass1!');
    await user.click(screen.getByRole('button', { name: /create driver/i }));

    expect(createMut.mutateAsync).toHaveBeenCalledWith({
      name: 'Nimal',
      password: 'DriverPass1!',
      vehicleNumber: 'CAB-1234',
      // Always sent, so a driver is only private when deliberately made so.
      isPrivate: false,
    });
  });

  it('will not create a driver with no vehicle', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
    await user.type(screen.getByLabelText(/^Password$/i), 'DriverPass1!');
    await user.click(screen.getByRole('button', { name: /create driver/i }));

    expect(await screen.findByText(/vehicle number is required/i)).toBeInTheDocument();
    expect(createMut.mutateAsync).not.toHaveBeenCalled();
  });

  it('sends the organization chosen from the list', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({ data: { _id: 'new-2', name: 'Nimal' } }),
    });
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
    await user.type(screen.getByLabelText(/Vehicle number/i), 'CAB-1234');
    await user.type(screen.getByLabelText(/^Password$/i), 'DriverPass1!');
    await chooseOption(user, /Organization category/i, 'School');
    await chooseOption(user, /^Organization$/i, 'Royal College');
    await user.click(screen.getByRole('button', { name: /create driver/i }));

    expect(createMut.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1' })
    );
  });

  it('sends a new organization by name and category when Create new is picked', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({ data: { _id: 'new-3', name: 'Nimal' } }),
    });
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
    await user.type(screen.getByLabelText(/Vehicle number/i), 'CAB-1234');
    await user.type(screen.getByLabelText(/^Password$/i), 'DriverPass1!');
    await user.click(screen.getByRole('button', { name: /create new/i }));
    await chooseOption(user, /Organization category/i, 'University');
    await user.type(screen.getByLabelText(/Organization name/i), 'Colombo Uni');
    await user.click(screen.getByRole('button', { name: /create driver/i }));

    expect(createMut.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationName: 'Colombo Uni',
        organizationCategory: 'UNIVERSITY',
      })
    );
  });

  it('cannot name a new organization before a category is chosen', async () => {
    const { user } = setup();
    await openForm(user);
    await user.click(screen.getByRole('button', { name: /create new/i }));

    expect(screen.getByLabelText(/Organization name/i)).toBeDisabled();
  });

  it('will not take more than ten digits of phone number', async () => {
    const { user } = setup();
    await openForm(user);

    const field = screen.getByLabelText(/Phone number/i);
    await user.type(field, '0755613572222222222225');

    expect(field).toHaveValue('0755613572');
  });

  it('takes the longer international number behind a +', async () => {
    const { user } = setup();
    await openForm(user);

    const field = screen.getByLabelText(/Phone number/i);
    await user.type(field, '+94755613572');

    expect(field).toHaveValue('+94755613572');
  });

  it('refuses a half-typed phone number on submit', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
    await user.type(screen.getByLabelText(/Vehicle number/i), 'CAB-1234');
    await user.type(screen.getByLabelText(/^Password$/i), 'DriverPass1!');
    await user.type(screen.getByLabelText(/Phone number/i), '07712');
    await user.click(screen.getByRole('button', { name: /create driver/i }));

    expect(await screen.findByText(/Sri Lankan phone number/i)).toBeInTheDocument();
    expect(createMut.mutateAsync).not.toHaveBeenCalled();
  });

  it('upper-cases the vehicle number as it is typed', async () => {
    const { user } = setup();
    await openForm(user);

    const field = screen.getByLabelText(/Vehicle number/i);
    await user.type(field, 'pf2327');

    // Still focused: the hyphen waits for blur, but the case does not.
    expect(field).toHaveValue('PF2327');
  });

  it('canonicalises the plate even when the field never loses focus', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({ data: { _id: 'new-7', name: 'Nimal' } }),
    });
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
    await user.type(screen.getByLabelText(/^Password$/i), 'DriverPass1!');
    // Typed last and submitted with Enter, so no blur ever fires.
    await user.type(screen.getByLabelText(/Vehicle number/i), 'pf2327{Enter}');

    expect(createMut.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleNumber: 'PF-2327' })
    );
  });

  it('tidies a Sri Lankan plate into its canonical form on blur', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({ data: { _id: 'new-6', name: 'Nimal' } }),
    });
    const { user } = setup({ createMut });
    await openForm(user);

    const field = screen.getByLabelText(/Vehicle number/i);
    await user.type(field, 'pf- 2327');
    await user.tab();

    expect(field).toHaveValue('PF-2327');
  });

  it('leaves a vehicle ID alone, since only plates have a format', async () => {
    const { user } = setup();
    await openForm(user);

    const field = screen.getByLabelText(/Vehicle number/i);
    await user.type(field, 'BUS-1');
    await user.tab();

    expect(field).toHaveValue('BUS-1');
  });

  it('sends the vehicle number when one is given', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({ data: { _id: 'new-4', name: 'Nimal' } }),
    });
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
    await user.type(screen.getByLabelText(/^Password$/i), 'DriverPass1!');
    await user.type(screen.getByLabelText(/Vehicle number/i), 'BUS-1');
    await user.click(screen.getByRole('button', { name: /create driver/i }));

    expect(createMut.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleNumber: 'BUS-1' })
    );
  });

  it('refuses a malformed email but accepts a blank one', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
    await user.type(screen.getByLabelText(/Vehicle number/i), 'CAB-1234');
    await user.type(screen.getByLabelText(/^Password$/i), 'DriverPass1!');
    await user.type(screen.getByLabelText(/Email \(optional\)/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /create driver/i }));

    expect(await screen.findByText(/valid email address, or leave it blank/i)).toBeInTheDocument();
    expect(createMut.mutateAsync).not.toHaveBeenCalled();
  });

  it('requires a password of at least 8 characters', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
    await user.type(screen.getByLabelText(/Vehicle number/i), 'CAB-1234');
    await user.type(screen.getByLabelText(/^Password$/i), 'short');
    await user.click(screen.getByRole('button', { name: /create driver/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(createMut.mutateAsync).not.toHaveBeenCalled();
  });

  it('hands back the driver ID after creating', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({
        data: {
          _id: 'new-5', name: 'Nimal', email: '', driverCode: 'DRV-1111-2222',
          vehicle: { _id: 'v1', vehicleId: 'BUS-1', numberPlate: 'AB-1234' },
        },
        enrollmentKey: 'TMD-AAAA-BBBB-CCCC',
      }),
    });
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
    await user.type(screen.getByLabelText(/Vehicle number/i), 'BUS-1');
    await user.type(screen.getByLabelText(/^Password$/i), 'DriverPass1!');
    await user.click(screen.getByRole('button', { name: /create driver/i }));

    // "Driver ID" is also a column header, so the summary card is found by the
    // code it shows.
    const driverCode = await screen.findByText('DRV-1111-2222');
    const summary = driverCode.closest('div').parentElement;
    expect(within(summary).getByText('Driver ID')).toBeInTheDocument();
    expect(screen.getByText('TMD-AAAA-BBBB-CCCC')).toBeInTheDocument();
  });
});

describe('ManagerAccountsPage: viewing a driver password', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const openRowMenu = (user, name = 'Kamal Perera') =>
    user.click(screen.getByRole('button', { name: `Actions for ${name}` }));

  const viewing = (password = 'DriverPass1!') => makeMutation({
    mutateAsync: vi.fn().mockResolvedValue({ data: { password } }),
  });

  const openDialog = async (viewPwMut) => {
    const { user } = setup({ viewPwMut });
    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /view password/i }));
    return user;
  };

  it('fetches only when asked, never with the directory', async () => {
    const viewPwMut = viewing();
    const { user } = setup({ viewPwMut });

    // Rendering the list must not pull credentials for every row.
    expect(viewPwMut.mutateAsync).not.toHaveBeenCalled();

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /view password/i }));

    expect(viewPwMut.mutateAsync).toHaveBeenCalledWith({ driverId: 'driver-1' });
  });

  it('shows the password with the sign-in ID it goes with', async () => {
    await openDialog(viewing('Secret123!'));

    expect(await screen.findByTestId('driver-password-value')).toHaveTextContent('Secret123!');
    // The ID is the half managers otherwise mistake for the enrollment key.
    // Scoped to the dialog: it also appears in the row behind it.
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('DRV-4K7P-9XQ2')).toBeInTheDocument();
  });

  it('tells the manager the view was recorded', async () => {
    await openDialog(viewing());

    expect(await screen.findByText(/recorded against your account/i)).toBeInTheDocument();
  });

  it('explains a driver with nothing stored instead of showing a blank', async () => {
    const viewPwMut = makeMutation({
      mutateAsync: vi.fn().mockRejectedValue({ code: 'PASSWORD_NOT_RECOVERABLE' }),
    });
    const { user } = setup({ viewPwMut });

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /view password/i }));

    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/reset it to set a new one/i));
    expect(screen.queryByTestId('driver-password-value')).not.toBeInTheDocument();
  });

  it('says so when the server has the feature switched off', async () => {
    const viewPwMut = makeMutation({
      mutateAsync: vi.fn().mockRejectedValue({ code: 'PASSWORD_RECOVERY_DISABLED' }),
    });
    const { user } = setup({ viewPwMut });

    await openRowMenu(user);
    await user.click(await screen.findByRole('menuitem', { name: /view password/i }));

    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/switched off/i));
  });

  it('drops the password from state once the dialog closes', async () => {
    const user = await openDialog(viewing('Secret123!'));
    expect(await screen.findByTestId('driver-password-value')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /done/i }));

    expect(screen.queryByTestId('driver-password-value')).not.toBeInTheDocument();
  });
});

// How many people ride with each driver, and the way through to who they are.
// A rider of a non-private driver enrols with no approval step, so this column
// is the only place in the portal that ever counts them.
describe('ManagerAccountsPage: riders column', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const withRiders = (riders) => ({ ...DRIVERS[0], riders });

  const ridersButton = (name = 'Kamal Perera', count = 3) =>
    screen.queryByRole('button', {
      name: `See the ${count} rider${count === 1 ? '' : 's'} enrolled with ${name}`,
    });

  it('counts the enrolled riders and opens that driver\'s roster', async () => {
    const { user } = setup({ drivers: [withRiders({ active: 3, pending: 0 })] });

    await user.click(ridersButton());

    expect(navigate).toHaveBeenCalledWith('/manager/requests?status=ACTIVE&driver=driver-1');
  });

  it('shows waiting requests alongside the enrolled count', () => {
    setup({ drivers: [withRiders({ active: 3, pending: 2 })] });
    expect(screen.getByText('2 pending')).toBeInTheDocument();
  });

  it('says None, and offers no link, when nobody has enrolled', () => {
    setup({ drivers: [withRiders({ active: 0, pending: 0 })] });

    expect(ridersButton('Kamal Perera', 0)).not.toBeInTheDocument();
    expect(screen.getAllByText('None').length).toBeGreaterThan(0);
  });

  it('treats a driver with no riders field as having none', () => {
    setup({ drivers: [DRIVERS[0]] });
    expect(screen.getAllByText('None').length).toBeGreaterThan(0);
  });

  it('names one rider in the singular', () => {
    setup({ drivers: [withRiders({ active: 1, pending: 0 })] });
    expect(ridersButton('Kamal Perera', 1)).toBeInTheDocument();
  });
});
