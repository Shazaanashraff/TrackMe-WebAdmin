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
  useDeleteManager: vi.fn(),
  useResetManagerPassword: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import {
  useManagers,
  useCreateManager,
  useUpdateManager,
  useUpdateManagerStatus,
  useDeleteManager,
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
  deleteMut,
  resetPwMut,
} = {}) {
  useManagers.mockReturnValue({ data: { data: rows }, isLoading: loading, error, refetch: vi.fn() });
  useCreateManager.mockReturnValue(createMut || makeMutation());
  useUpdateManager.mockReturnValue(updateMut || makeMutation());
  useUpdateManagerStatus.mockReturnValue(statusMut || makeMutation());
  useDeleteManager.mockReturnValue(deleteMut || makeMutation());
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

  it('calls createManager mutation with the password the super admin set', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });
    await user.click(screen.getByRole('button', { name: /add manager/i }));
    await screen.findByRole('heading', { name: /add manager/i });

    await user.type(screen.getByLabelText(/manager name/i), 'Carol');
    await user.type(screen.getByLabelText(/email/i), 'carol@co.com');
    await user.type(screen.getByLabelText(/^password$/i), 'CarolPass1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'CarolPass1!');
    await user.click(screen.getByRole('button', { name: /create manager/i }));

    expect(createMut.mutateAsync).toHaveBeenCalledWith({
      name: 'Carol',
      email: 'carol@co.com',
      password: 'CarolPass1!',
    });
  });

  it('rejects mismatched passwords', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });
    await user.click(screen.getByRole('button', { name: /add manager/i }));
    await screen.findByRole('heading', { name: /add manager/i });

    await user.type(screen.getByLabelText(/manager name/i), 'Carol');
    await user.type(screen.getByLabelText(/email/i), 'carol@co.com');
    await user.type(screen.getByLabelText(/^password$/i), 'CarolPass1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'CarolPass2!');
    await user.click(screen.getByRole('button', { name: /create manager/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(createMut.mutateAsync).not.toHaveBeenCalled();
  });

  it('toggles password visibility', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /add manager/i }));
    await screen.findByRole('heading', { name: /add manager/i });

    const passwordField = screen.getByLabelText(/^password$/i);
    expect(passwordField).toHaveAttribute('type', 'password');

    // Each field has its own toggle; the first belongs to the password field.
    await user.click(screen.getAllByRole('button', { name: /show password/i })[0]);
    expect(passwordField).toHaveAttribute('type', 'text');

    await user.click(screen.getAllByRole('button', { name: /hide password/i })[0]);
    expect(passwordField).toHaveAttribute('type', 'password');
  });

  it('requires a password when creating a manager', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });
    await user.click(screen.getByRole('button', { name: /add manager/i }));
    await screen.findByRole('heading', { name: /add manager/i });

    await user.type(screen.getByLabelText(/manager name/i), 'Carol');
    await user.type(screen.getByLabelText(/email/i), 'carol@co.com');
    await user.click(screen.getByRole('button', { name: /create manager/i }));

    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(createMut.mutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a weak password before sending the request', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });
    await user.click(screen.getByRole('button', { name: /add manager/i }));
    await screen.findByRole('heading', { name: /add manager/i });

    await user.type(screen.getByLabelText(/manager name/i), 'Carol');
    await user.type(screen.getByLabelText(/email/i), 'carol@co.com');
    await user.type(screen.getByLabelText(/^password$/i), 'alllowercase');
    await user.type(screen.getByLabelText(/confirm password/i), 'alllowercase');
    await user.click(screen.getByRole('button', { name: /create manager/i }));

    expect(
      screen.getByText(/password must contain an uppercase letter/i),
    ).toBeInTheDocument();
    expect(createMut.mutateAsync).not.toHaveBeenCalled();
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

  it('sets a new password directly from the edit dialog', async () => {
    const resetPwMut = makeMutation({ mutateAsync: vi.fn().mockResolvedValue({}) });
    const { user } = setup({ resetPwMut });

    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editBtns[0]);
    await screen.findByRole('dialog');

    await user.type(screen.getByLabelText(/^new password$/i), 'BrandNew1!');
    await user.type(screen.getByLabelText(/confirm new password/i), 'BrandNew1!');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(resetPwMut.mutateAsync).toHaveBeenCalledWith({
      managerId: 'm1',
      payload: { password: 'BrandNew1!' },
    });
  });

  it('cannot submit an empty password from the edit dialog', async () => {
    const resetPwMut = makeMutation();
    const { user } = setup({ resetPwMut });

    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editBtns[0]);
    await screen.findByRole('dialog');

    // Password is optional on edit, so the action stays disabled until one is typed.
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled();
    expect(resetPwMut.mutateAsync).not.toHaveBeenCalled();
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

  // Deleting is irreversible, so the button only unlocks once a manager has been
  // deactivated — MGR_A is active, MGR_B is not.
  describe('Delete manager', () => {
    const deleteButtons = () => screen.getAllByRole('button', { name: /^delete$/i });

    it('disables Delete for an active manager and enables it for a deactivated one', () => {
      setup();
      const [activeRowDelete, inactiveRowDelete] = deleteButtons();
      expect(activeRowDelete).toBeDisabled();
      expect(inactiveRowDelete).toBeEnabled();
    });

    it('explains why Delete is unavailable while the manager is active', () => {
      setup();
      expect(deleteButtons()[0]).toHaveAttribute(
        'title',
        expect.stringMatching(/deactivate/i),
      );
    });

    it('does not delete immediately, it asks for confirmation first', async () => {
      const deleteMut = makeMutation();
      const { user } = setup({ deleteMut });

      await user.click(deleteButtons()[1]);

      expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
      expect(deleteMut.mutateAsync).not.toHaveBeenCalled();
    });

    it('deletes the manager once the confirmation is accepted', async () => {
      const deleteMut = makeMutation();
      const { user } = setup({ deleteMut });

      await user.click(deleteButtons()[1]);
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: /delete manager/i }));

      expect(deleteMut.mutateAsync).toHaveBeenCalledWith({ managerId: 'm2' });
    });

    it('does not delete when the confirmation is cancelled', async () => {
      const deleteMut = makeMutation();
      const { user } = setup({ deleteMut });

      await user.click(deleteButtons()[1]);
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

      expect(deleteMut.mutateAsync).not.toHaveBeenCalled();
    });

    it('warns that the deletion cannot be undone', async () => {
      const { user } = setup();

      await user.click(deleteButtons()[1]);
      const dialog = await screen.findByRole('alertdialog');

      expect(within(dialog).getByText(/cannot be undone/i)).toBeInTheDocument();
      // The vehicles must be described as surviving, not deleted alongside.
      expect(within(dialog).getByText(/unassigned/i)).toBeInTheDocument();
    });
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
