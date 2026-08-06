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
  useDriverEnrollmentKey: vi.fn(),
  useRotateDriverEnrollmentKey: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: vi.fn() }));

import {
  useOrganizations,
  useManagerDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
  useResetDriverPassword,
  useDriverEnrollmentKey,
  useRotateDriverEnrollmentKey,
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

function defaultHooks({ drivers = DRIVERS, organizations = ORGANIZATIONS, createMut } = {}) {
  useManagerDrivers.mockReturnValue({
    data: { data: drivers }, isLoading: false, error: null, refetch: vi.fn(),
  });
  useOrganizations.mockReturnValue({ data: { data: organizations }, isLoading: false });
  useCreateDriver.mockReturnValue(createMut || makeMutation());
  useUpdateDriver.mockReturnValue(makeMutation());
  useDeleteDriver.mockReturnValue(makeMutation());
  useResetDriverPassword.mockReturnValue(makeMutation());
  useDriverEnrollmentKey.mockReturnValue(makeMutation());
  useRotateDriverEnrollmentKey.mockReturnValue(makeMutation());
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

  it('says the password lasts until the driver changes it', async () => {
    const { user } = setup();
    await openForm(user);

    expect(screen.getByText(/permanent Driver ID is generated automatically/i)).toBeInTheDocument();
    expect(screen.getByText(/until they change it/i)).toBeInTheDocument();
  });

  it('creates a driver from the name and password alone', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({
        data: { _id: 'new-1', name: 'Nimal', email: '', driverCode: 'DRV-1111-2222' },
        enrollmentKey: 'TMD-AAAA-BBBB-CCCC',
      }),
    });
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
    await user.type(screen.getByLabelText(/^Password$/i), 'DriverPass1!');
    await user.click(screen.getByRole('button', { name: /create driver/i }));

    expect(createMut.mutateAsync).toHaveBeenCalledWith({
      name: 'Nimal',
      password: 'DriverPass1!',
    });
  });

  it('sends the organization chosen from the list', async () => {
    const createMut = makeMutation({
      mutateAsync: vi.fn().mockResolvedValue({ data: { _id: 'new-2', name: 'Nimal' } }),
    });
    const { user } = setup({ createMut });
    await openForm(user);

    await user.type(screen.getByLabelText(/Full name/i), 'Nimal');
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
