import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ForgotPasswordResetPage } from '../ForgotPasswordResetPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    resetPasswordWithToken: vi.fn(),
  },
}));

function renderPage(initialState = { email: 'manager@trackme.com', resetToken: 'reset-tok-1' }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/forgot-password/reset', state: initialState }]}>
      <Routes>
        <Route path="/forgot-password/reset" element={<ForgotPasswordResetPage />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ForgotPasswordResetPage', () => {
  it('renders both password fields masked by default with a reveal toggle (issue #7)', () => {
    renderPage();

    const newPassword = screen.getByLabelText(/^new password$/i);
    const confirmPassword = screen.getByLabelText(/^confirm password$/i);
    expect(newPassword).toHaveAttribute('type', 'password');
    expect(confirmPassword).toHaveAttribute('type', 'password');

    expect(screen.getAllByRole('button', { name: /show password/i })).toHaveLength(2);
  });

  it('reveals a password field independently when its toggle is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    const newPassword = screen.getByLabelText(/^new password$/i);
    const confirmPassword = screen.getByLabelText(/^confirm password$/i);
    const [showNew] = screen.getAllByRole('button', { name: /show password/i });

    await user.click(showNew);

    expect(newPassword).toHaveAttribute('type', 'text');
    expect(confirmPassword).toHaveAttribute('type', 'password');
  });

  it('rejects mismatched passwords without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^new password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/^confirm password$/i), 'Different123!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(adminApi.resetPasswordWithToken).not.toHaveBeenCalled();
  });

  it('shows a live mismatch message on blur, before ever submitting (issue #71)', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^new password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/^confirm password$/i), 'Different123!');
    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();

    await user.tab();

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(adminApi.resetPasswordWithToken).not.toHaveBeenCalled();
  });

  it('clears the live mismatch message once the confirm field matches', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^new password$/i), 'Password123!');
    const confirmField = screen.getByLabelText(/^confirm password$/i);
    await user.type(confirmField, 'Different123!');
    await user.tab();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();

    await user.clear(confirmField);
    await user.type(confirmField, 'Password123!');
    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
  });

  it('submits the new password and navigates to login on success', async () => {
    adminApi.resetPasswordWithToken.mockResolvedValueOnce({});
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^new password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/^confirm password$/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(adminApi.resetPasswordWithToken).toHaveBeenCalledWith(
      'manager@trackme.com',
      'reset-tok-1',
      'Password123!'
    );
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('shows the server error message on failure', async () => {
    adminApi.resetPasswordWithToken.mockRejectedValueOnce(new Error('Reset token expired'));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^new password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/^confirm password$/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText('Reset token expired')).toBeInTheDocument();
  });
});
