import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ManagersPage } from '../ManagersPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/use-managers', () => ({
  useManagers: vi.fn(),
  useCreateManager: vi.fn(),
  useUpdateManager: vi.fn(),
  useUpdateManagerStatus: vi.fn(),
  useResetManagerPassword: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import {
  useManagers,
  useCreateManager,
  useUpdateManager,
  useUpdateManagerStatus,
  useResetManagerPassword,
} from '@/hooks/use-managers';

const MGR_A = { _id: 'm1', name: 'Alice Smith', email: 'alice@co.com', isActive: true };
const MGR_B = { _id: 'm2', name: 'Bob Jones', email: 'bob@co.com', isActive: false };

function makeMutation(overrides = {}) {
  return {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    variables: undefined,
    ...overrides,
  };
}

function defaultHooks({
  rows = [MGR_A, MGR_B],
  loading = false,
  error = null,
  createMut,
  updateMut,
  statusMut,
  resetPwMut,
} = {}) {
  useManagers.mockReturnValue({ data: { data: rows }, isLoading: loading, error, refetch: vi.fn() });
  useCreateManager.mockReturnValue(createMut || makeMutation());
  useUpdateManager.mockReturnValue(updateMut || makeMutation());
  useUpdateManagerStatus.mockReturnValue(statusMut || makeMutation());
  useResetManagerPassword.mockReturnValue(resetPwMut || makeMutation());
}

function setup(opts = {}) {
  defaultHooks(opts);
  const user = userEvent.setup();
  render(<MemoryRouter><ManagersPage /></MemoryRouter>);
  return { user };
}

describe('ManagersPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders page heading and Add Manager button', () => {
    setup();
    expect(screen.getByRole('heading', { name: /managers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add manager/i })).toBeInTheDocument();
  });

  it('shows stat cards with correct counts', () => {
    setup();
    expect(screen.getByText('Total Managers')).toBeInTheDocument();
    expect(screen.getByText('Active Managers')).toBeInTheDocument();
    expect(screen.getByText('Inactive Managers')).toBeInTheDocument();
    // Total=2, Active=1, Inactive=1 — values may appear multiple times (table + cards)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2);
  });

  it('renders manager rows in the table', () => {
    setup();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@co.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('shows active/suspended badges in the table', () => {
    setup();
    // "Active" badge for Alice (active=true), "Suspended" for Bob (active=false)
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('shows loading skeletons when fetching', () => {
    setup({ loading: true, rows: [] });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shows error state when query fails', () => {
    setup({ error: new Error('Network error'), rows: [] });
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('opens Add Manager dialog on button click', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /add manager/i }));
    expect(await screen.findByRole('heading', { name: /add manager/i })).toBeInTheDocument();
  });

  it('validates empty name on submit', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /add manager/i }));
    await screen.findByRole('heading', { name: /add manager/i });
    await user.click(screen.getByRole('button', { name: /create manager/i }));
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });

  it('calls createManager mutation with correct payload (no password field)', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });
    await user.click(screen.getByRole('button', { name: /add manager/i }));
    await screen.findByRole('heading', { name: /add manager/i });

    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/manager name/i), 'Carol');
    await user.type(screen.getByLabelText(/email/i), 'carol@co.com');
    await user.click(screen.getByRole('button', { name: /create manager/i }));

    expect(createMut.mutateAsync).toHaveBeenCalledWith({
      name: 'Carol',
      email: 'carol@co.com',
    });
  });

  it('opens edit dialog pre-filled with manager data', async () => {
    const { user } = setup();
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editBtns[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByDisplayValue('Alice Smith')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('alice@co.com')).toBeInTheDocument();
  });

  it('calls updateManager mutation on edit save', async () => {
    const updateMut = makeMutation();
    const { user } = setup({ updateMut });

    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editBtns[0]);
    await screen.findByRole('dialog');

    const nameInput = screen.getByDisplayValue('Alice Smith');
    await user.clear(nameInput);
    await user.type(nameInput, 'Alice Updated');
    await user.click(screen.getByRole('button', { name: /update manager/i }));

    expect(updateMut.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ name: 'Alice Updated' }) }),
    );
  });

  it('sends a password reset email from the edit dialog instead of setting one directly', async () => {
    const resetPwMut = makeMutation({ mutateAsync: vi.fn().mockResolvedValue({ message: 'Reset link emailed to the manager.' }) });
    const { user } = setup({ resetPwMut });

    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editBtns[0]);
    await screen.findByRole('dialog');

    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /send password reset email/i }));

    expect(resetPwMut.mutateAsync).toHaveBeenCalledWith({ managerId: 'm1', payload: {} });
  });

  it('calls updateManagerStatus when Deactivate is clicked', async () => {
    const statusMut = makeMutation();
    const { user } = setup({ statusMut });

    const deactivateBtns = screen.getAllByRole('button', { name: /deactivate/i });
    await user.click(deactivateBtns[0]);

    expect(statusMut.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ managerId: 'm1', payload: { isActive: false } }),
    );
  });

  it('shows empty state when no managers exist', () => {
    setup({ rows: [] });
    expect(screen.getByText('No managers yet')).toBeInTheDocument();
  });

  it('navigates to that manager\'s Operations detail when View is clicked', async () => {
    const { user } = setup();
    const viewBtns = screen.getAllByRole('button', { name: /view/i });
    await user.click(viewBtns[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/operations?managerId=m1');
  });
});
