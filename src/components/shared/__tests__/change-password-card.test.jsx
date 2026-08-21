import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordCard } from '../change-password-card';
import { adminApi } from '../../../api';

vi.mock('../../../api', () => ({
  adminApi: {
    changePassword: vi.fn(),
  },
}));

function fillForm(user, { current = 'OldP@ss1!', next = 'NewP@ss1!', confirm = 'NewP@ss1!' } = {}) {
  return Promise.resolve()
    .then(() => user.type(screen.getByLabelText(/^current password$/i), current))
    .then(() => user.type(screen.getByLabelText(/^new password$/i), next))
    .then(() => user.type(screen.getByLabelText(/^confirm new password$/i), confirm));
}

describe('ChangePasswordCard', () => {
  beforeEach(() => {
    adminApi.changePassword.mockReset();
  });

  it('renders masked current/new/confirm password fields', () => {
    render(<ChangePasswordCard />);

    expect(screen.getByLabelText(/^current password$/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/^new password$/i)).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText(/^confirm new password$/i)).toHaveAttribute('type', 'password');
  });

  it('submits current + new password and shows a success message', async () => {
    adminApi.changePassword.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ChangePasswordCard />);

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(adminApi.changePassword).toHaveBeenCalledWith('OldP@ss1!', 'NewP@ss1!');
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
  });

  it('clears the fields after a successful update', async () => {
    adminApi.changePassword.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ChangePasswordCard />);

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await screen.findByText(/password updated/i);
    expect(screen.getByLabelText(/^current password$/i)).toHaveValue('');
    expect(screen.getByLabelText(/^new password$/i)).toHaveValue('');
    expect(screen.getByLabelText(/^confirm new password$/i)).toHaveValue('');
  });

  it('blocks submission and shows an inline error when confirm does not match new password', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordCard />);

    await fillForm(user, { next: 'NewP@ss1!', confirm: 'Different1!' });
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(adminApi.changePassword).not.toHaveBeenCalled();
  });

  it('surfaces a wrong-current-password server error inline without clearing the form', async () => {
    adminApi.changePassword.mockRejectedValue(new Error('Current password is incorrect'));
    const user = userEvent.setup();
    render(<ChangePasswordCard />);

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/current password is incorrect/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toHaveValue('NewP@ss1!');
  });
});
