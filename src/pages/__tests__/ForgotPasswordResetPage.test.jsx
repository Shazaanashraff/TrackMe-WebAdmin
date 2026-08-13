import { describe, it, expect, vi, beforeEach } from 'vitest';
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
        <Route path="/forgot-password/verify" element={<div>Verify page</div>} />
        <Route path="/forgot-password" element={<div>Request page</div>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ForgotPasswordResetPage', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('still shows the restart warning when neither router state nor sessionStorage has a resetToken', () => {
    renderPage({});

    expect(screen.getByText(/start the recovery flow again/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
  });

  it('recovers email and resetToken from sessionStorage after a refresh loses router state (issue #55)', () => {
    sessionStorage.setItem('forgot-password-flow', JSON.stringify({
      email: 'manager@trackme.com',
      resetToken: 'reset-tok-1',
    }));
    renderPage({});

    expect(screen.queryByText(/start the recovery flow again/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveValue('manager@trackme.com');
  });

  it('renders the reset form when email and resetToken are present', () => {
    renderPage();

    expect(screen.getByLabelText(/^Email/)).toHaveValue('manager@trackme.com');
    expect(screen.getByLabelText(/^New password/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm password/)).toBeInTheDocument();
  });

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

  it('disables the submit button and shows an updating state while the request is in flight', async () => {
    let resolveRequest;
    adminApi.resetPasswordWithToken.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^new password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/^confirm password$/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled();

    resolveRequest({});
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

  it('clears the persisted flow state once the password is successfully reset', async () => {
    sessionStorage.setItem('forgot-password-flow', JSON.stringify({
      email: 'manager@trackme.com',
      resetToken: 'reset-tok-1',
    }));
    adminApi.resetPasswordWithToken.mockResolvedValueOnce({});
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^new password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/^confirm password$/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await screen.findByText('Login page');
    expect(sessionStorage.getItem('forgot-password-flow')).toBeNull();
  });
});
