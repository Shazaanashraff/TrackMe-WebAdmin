import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ManagerAccountsPage } from '../ManagerAccountsPage';

vi.mock('@/hooks/use-buses', () => ({
  useManagerBuses: vi.fn(),
  useResetBusAccountPassword: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import { useManagerBuses, useResetBusAccountPassword } from '@/hooks/use-buses';
import { toast } from 'sonner';

const BUSES = [
  { _id: 'b1', busId: 'BUS-1', busName: 'Shuttle 1', numberPlate: 'AB-1234', routeId: 'PUB-1', driverId: { email: 'driver@test.com' } },
  { _id: 'b2', busId: 'BUS-2', busName: 'Express 2', numberPlate: 'CD-5678', routeId: 'PUB-2' },
];

function makeMutation(overrides = {}) {
  return { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, ...overrides };
}

function defaultHooks({ buses = BUSES, loading = false, error = null, resetMut } = {}) {
  useManagerBuses.mockReturnValue({
    data: buses ? { data: buses } : undefined,
    isLoading: loading,
    isError: Boolean(error),
    error,
    refetch: vi.fn(),
  });
  useResetBusAccountPassword.mockReturnValue(resetMut || makeMutation());
}

function setup(opts) {
  defaultHooks(opts);
  const user = userEvent.setup();
  render(<MemoryRouter><ManagerAccountsPage /></MemoryRouter>);
  return { user };
}

async function fillPasswords(user, { old = '', next = '', confirm = '' }) {
  if (old) await user.type(screen.getByLabelText(/^old password$/i), old);
  if (next) await user.type(screen.getByLabelText(/^new password$/i), next);
  if (confirm) await user.type(screen.getByLabelText(/^confirm new password$/i), confirm);
}

describe('ManagerAccountsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /account management/i })).toBeInTheDocument();
  });

  it('shows managed buses count stat card', () => {
    setup();
    expect(screen.getByText('Managed Buses')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('renders the form during load (loading does not crash)', () => {
    setup({ loading: true, buses: null });
    // Page heading and form remain visible during load
    expect(screen.getByRole('heading', { level: 1, name: /account management/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
  });

  it('renders reset form with bus select and old/new/confirm password inputs', () => {
    setup();
    expect(screen.getByLabelText(/^bus$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^old password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirm new password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
  });

  it('renders context panel with selected bus details', () => {
    setup();
    // Auto-selects first bus → context shows BUS-1 details
    expect(screen.getByText(/Selected Account Context/i)).toBeInTheDocument();
  });

  it('each password field has a show/hide visibility toggle', async () => {
    const { user } = setup();
    const oldInput = screen.getByLabelText(/^old password$/i);
    expect(oldInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show old password/i }));
    expect(oldInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /hide old password/i }));
    expect(oldInput).toHaveAttribute('type', 'password');
  });

  it('shows validation error when no bus is selected', async () => {
    const { user } = setup({ buses: [] }); // empty = no auto-select
    await fillPasswords(user, { old: 'oldpass1', next: 'password123', confirm: 'password123' });
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(screen.getByText(/please select a bus/i)).toBeInTheDocument();
  });

  it('shows validation error when old password is empty', async () => {
    const { user } = setup();
    await fillPasswords(user, { next: 'password123', confirm: 'password123' });
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(screen.getByText(/old password is required/i)).toBeInTheDocument();
  });

  it('shows validation error when new password is empty', async () => {
    const { user } = setup();
    await fillPasswords(user, { old: 'oldpass1' });
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(screen.getByText(/new password is required/i)).toBeInTheDocument();
  });

  it('shows validation error when new password is too short', async () => {
    const { user } = setup();
    await fillPasswords(user, { old: 'oldpass1', next: 'short', confirm: 'short' });
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows validation error when new password and confirmation do not match', async () => {
    const { user } = setup();
    await fillPasswords(user, { old: 'oldpass1', next: 'Secure1234!', confirm: 'Different1234!' });
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
  });

  it('calls resetBusAccountPassword mutation with oldPassword + password payload', async () => {
    const resetMut = makeMutation();
    const { user } = setup({ resetMut });

    await fillPasswords(user, { old: 'oldpass1', next: 'Secure1234!', confirm: 'Secure1234!' });
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(resetMut.mutateAsync).toHaveBeenCalledTimes(1));
    const call = resetMut.mutateAsync.mock.calls[0][0];
    expect(call.busId).toBe('BUS-1'); // auto-selected first bus
    expect(call.payload.oldPassword).toBe('oldpass1');
    expect(call.payload.password).toBe('Secure1234!');
  });

  it('shows success toast and clears all password fields on success', async () => {
    const { user } = setup();
    await fillPasswords(user, { old: 'oldpass1', next: 'Secure1234!', confirm: 'Secure1234!' });
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringMatching(/updated successfully/i)));
    expect(screen.getByLabelText(/^old password$/i)).toHaveValue('');
    expect(screen.getByLabelText(/^new password$/i)).toHaveValue('');
    expect(screen.getByLabelText(/^confirm new password$/i)).toHaveValue('');
  });

  it('shows a wrong-old-password server error inline', async () => {
    const resetMut = makeMutation({ mutateAsync: vi.fn().mockRejectedValue(new Error('Old password is incorrect')) });
    const { user } = setup({ resetMut });

    await fillPasswords(user, { old: 'wrongpass', next: 'Secure1234!', confirm: 'Secure1234!' });
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(screen.getByText(/old password is incorrect/i)).toBeInTheDocument());
  });
});
