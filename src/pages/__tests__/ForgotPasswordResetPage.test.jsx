import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ForgotPasswordResetPage } from '../ForgotPasswordResetPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    resetPasswordWithToken: vi.fn()
  }
}));

function renderAt(path, state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path="/forgot-password/reset" element={<ForgotPasswordResetPage />} />
        <Route path="/forgot-password/verify" element={<div>Verify page</div>} />
        <Route path="/forgot-password" element={<div>Request page</div>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ForgotPasswordResetPage', () => {
  it('shows a restart-the-flow warning when there is no email/resetToken in router state (e.g. after a refresh)', () => {
    renderAt('/forgot-password/reset', undefined);

    expect(screen.getByText(/start the recovery flow again/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });

  it('renders the reset form when email and resetToken are present', () => {
    renderAt('/forgot-password/reset', { email: 'manager@trackme.com', resetToken: 'reset-tok-1' });

    expect(screen.getByLabelText(/^Email/)).toHaveValue('manager@trackme.com');
    expect(screen.getByLabelText(/^New password/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm password/)).toBeInTheDocument();
  });

  it('rejects a mismatched confirm-password without calling the API', async () => {
    const user = userEvent.setup();
    renderAt('/forgot-password/reset', { email: 'manager@trackme.com', resetToken: 'reset-tok-1' });

    await user.type(screen.getByLabelText(/^New password/), 'brandNewPass1');
    await user.type(screen.getByLabelText(/^Confirm password/), 'somethingElse');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(adminApi.resetPasswordWithToken).not.toHaveBeenCalled();
  });

  it('submits email, resetToken, and the new password, then redirects to /login on success', async () => {
    adminApi.resetPasswordWithToken.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();

    renderAt('/forgot-password/reset', { email: 'manager@trackme.com', resetToken: 'reset-tok-1' });

    await user.type(screen.getByLabelText(/^New password/), 'brandNewPass1');
    await user.type(screen.getByLabelText(/^Confirm password/), 'brandNewPass1');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(adminApi.resetPasswordWithToken).toHaveBeenCalledWith(
      'manager@trackme.com',
      'reset-tok-1',
      'brandNewPass1'
    );
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('shows the server error message when the reset call fails (e.g. expired resetToken)', async () => {
    adminApi.resetPasswordWithToken.mockRejectedValueOnce(new Error('Reset token expired'));
    const user = userEvent.setup();

    renderAt('/forgot-password/reset', { email: 'manager@trackme.com', resetToken: 'reset-tok-1' });

    await user.type(screen.getByLabelText(/^New password/), 'brandNewPass1');
    await user.type(screen.getByLabelText(/^Confirm password/), 'brandNewPass1');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText('Reset token expired')).toBeInTheDocument();
  });

  it('disables the submit button and shows an updating state while the request is in flight', async () => {
    let resolveRequest;
    adminApi.resetPasswordWithToken.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const user = userEvent.setup();

    renderAt('/forgot-password/reset', { email: 'manager@trackme.com', resetToken: 'reset-tok-1' });

    await user.type(screen.getByLabelText(/^New password/), 'brandNewPass1');
    await user.type(screen.getByLabelText(/^Confirm password/), 'brandNewPass1');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled();

    resolveRequest({ success: true });
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
});
