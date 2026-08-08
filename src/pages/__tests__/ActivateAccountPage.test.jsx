import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ActivateAccountPage } from '../ActivateAccountPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    validateAccountSetup: vi.fn(),
    completeAccountSetup: vi.fn(),
  },
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/activate" element={<ActivateAccountPage />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ActivateAccountPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows a link-invalid message when there is no token', async () => {
    renderAt('/activate');
    expect(await screen.findByText('Link invalid')).toBeInTheDocument();
    expect(adminApi.validateAccountSetup).not.toHaveBeenCalled();
  });

  it('shows a link-invalid message when the token fails validation', async () => {
    adminApi.validateAccountSetup.mockRejectedValueOnce(new Error('This link is invalid or has expired.'));
    renderAt('/activate?token=bad-token');

    expect(await screen.findByText('Link invalid')).toBeInTheDocument();
    expect(screen.getByText('This link is invalid or has expired.')).toBeInTheDocument();
  });

  it('validates the token and shows the activate-account form for an INVITE', async () => {
    adminApi.validateAccountSetup.mockResolvedValueOnce({
      email: 'manager@trackme.com',
      name: 'New Manager',
      purpose: 'INVITE',
    });
    renderAt('/activate?token=good-token');

    expect(await screen.findByText('Activate your account')).toBeInTheDocument();
    expect(screen.getByText(/manager@trackme.com/)).toBeInTheDocument();
    expect(adminApi.validateAccountSetup).toHaveBeenCalledWith('good-token');
  });

  it('shows "Reset your password" copy for a RESET purpose', async () => {
    adminApi.validateAccountSetup.mockResolvedValueOnce({
      email: 'manager@trackme.com',
      purpose: 'RESET',
    });
    renderAt('/activate?token=good-token');

    expect(await screen.findByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reset password$/i })).toBeInTheDocument();
  });

  it('submits the new password and redirects to /login on success', async () => {
    adminApi.validateAccountSetup.mockResolvedValueOnce({
      email: 'manager@trackme.com',
      purpose: 'INVITE',
    });
    adminApi.completeAccountSetup.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    renderAt('/activate?token=good-token');

    await screen.findByText('Activate your account');
    await user.type(screen.getByLabelText(/new password/i), 'brandnewpassword');
    await user.type(screen.getByLabelText(/confirm password/i), 'brandnewpassword');
    await user.click(screen.getByRole('button', { name: /activate account/i }));

    expect(adminApi.completeAccountSetup).toHaveBeenCalledWith('good-token', 'brandnewpassword');
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('shows an error when passwords do not match', async () => {
    adminApi.validateAccountSetup.mockResolvedValueOnce({
      email: 'manager@trackme.com',
      purpose: 'INVITE',
    });
    const user = userEvent.setup();
    renderAt('/activate?token=good-token');

    await screen.findByText('Activate your account');
    await user.type(screen.getByLabelText(/new password/i), 'passwordone');
    await user.type(screen.getByLabelText(/confirm password/i), 'passwordtwo');
    await user.click(screen.getByRole('button', { name: /activate account/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(adminApi.completeAccountSetup).not.toHaveBeenCalled();
  });

  it('shows a live mismatch message on blur, before ever submitting (issue #71)', async () => {
    adminApi.validateAccountSetup.mockResolvedValueOnce({
      email: 'manager@trackme.com',
      purpose: 'INVITE',
    });
    const user = userEvent.setup();
    renderAt('/activate?token=good-token');

    await screen.findByText('Activate your account');
    await user.type(screen.getByLabelText(/new password/i), 'passwordone');
    await user.type(screen.getByLabelText(/confirm password/i), 'passwordtwo');
    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();

    await user.tab();

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(adminApi.completeAccountSetup).not.toHaveBeenCalled();
  });

  it('shows the server error message when completeAccountSetup fails', async () => {
    adminApi.validateAccountSetup.mockResolvedValueOnce({
      email: 'manager@trackme.com',
      purpose: 'INVITE',
    });
    adminApi.completeAccountSetup.mockRejectedValueOnce(new Error('This link is invalid or has expired.'));
    const user = userEvent.setup();
    renderAt('/activate?token=good-token');

    await screen.findByText('Activate your account');
    await user.type(screen.getByLabelText(/new password/i), 'brandnewpassword');
    await user.type(screen.getByLabelText(/confirm password/i), 'brandnewpassword');
    await user.click(screen.getByRole('button', { name: /activate account/i }));

    expect(await screen.findByText('This link is invalid or has expired.')).toBeInTheDocument();
  });
});
