import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AccountSettingsPanel } from '../account-settings-panel';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/use-profile', () => ({ useUpdateOwnProfile: vi.fn() }));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import { useUpdateOwnProfile } from '@/hooks/use-profile';
import { toast } from 'sonner';

const USER = { name: 'Kamal Perera', email: 'kamal@trackme.com', role: 'admin' };

function makeMutation(overrides = {}) {
  return { mutateAsync: vi.fn().mockResolvedValue({ data: { name: 'New Name' } }), isPending: false, ...overrides };
}

function setup(user = USER, onUserUpdate = vi.fn(), mut) {
  useUpdateOwnProfile.mockReturnValue(mut || makeMutation());
  render(
    <MemoryRouter>
      <AccountSettingsPanel user={user} onUserUpdate={onUserUpdate} />
    </MemoryRouter>
  );
}

describe('AccountSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the current name and read-only email', () => {
    setup();
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Kamal Perera');
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('kamal@trackme.com');
    expect(screen.getByLabelText(/^email$/i)).toBeDisabled();
  });

  it('disables Save when the name is unchanged', () => {
    setup();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('saves a changed name, notifies the parent, and toasts', async () => {
    const onUserUpdate = vi.fn();
    const mut = makeMutation({ mutateAsync: vi.fn().mockResolvedValue({ data: { name: 'New Name' } }) });
    setup(USER, onUserUpdate, mut);

    await userEvent.clear(screen.getByLabelText(/^name$/i));
    await userEvent.type(screen.getByLabelText(/^name$/i), 'New Name');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mut.mutateAsync).toHaveBeenCalledWith('New Name'));
    expect(onUserUpdate).toHaveBeenCalledWith({ name: 'New Name' });
    expect(toast).toHaveBeenCalledWith('Profile updated');
  });

  it('rejects an empty name without calling the mutation', async () => {
    const mut = makeMutation();
    setup(USER, vi.fn(), mut);

    await userEvent.clear(screen.getByLabelText(/^name$/i));
    // Button stays enabled (empty !== unchanged) but submit is rejected client-side.
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(mut.mutateAsync).not.toHaveBeenCalled();
  });

  it('shows a server error inline when saving fails', async () => {
    const mut = makeMutation({ mutateAsync: vi.fn().mockRejectedValue(new Error('Name already taken')) });
    setup(USER, vi.fn(), mut);

    await userEvent.clear(screen.getByLabelText(/^name$/i));
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Someone Else');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('Name already taken')).toBeInTheDocument();
  });

  it('navigates to the forgot-password flow with the account email on Change password', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /change password/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password', { state: { email: 'kamal@trackme.com' } });
  });
});
