import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ForgotPasswordVerifyPage } from '../ForgotPasswordVerifyPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    verifyPasswordResetOtp: vi.fn(),
    requestPasswordResetOtp: vi.fn(),
  },
}));

function renderPage(initialState = { email: 'manager@trackme.com' }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/forgot-password/verify', state: initialState }]}>
      <Routes>
        <Route path="/forgot-password/verify" element={<ForgotPasswordVerifyPage />} />
        <Route path="/forgot-password/reset" element={<div>Reset password page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ForgotPasswordVerifyPage', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('renders the code field with a numeric input affordance (issue #20)', () => {
    renderPage();
    const codeField = screen.getByLabelText(/recovery code/i);
    expect(codeField).toHaveAttribute('inputmode', 'numeric');
    expect(codeField).toHaveAttribute('pattern', '[0-9]*');
    expect(screen.getByText('6 digits, numbers only')).toBeInTheDocument();
  });

  it('strips non-digit characters and caps entry at 6 digits', async () => {
    const user = userEvent.setup();
    renderPage();
    const codeField = screen.getByLabelText(/recovery code/i);

    await user.type(codeField, 'a1b2c3d4e5f6g7');

    expect(codeField).toHaveValue('123456');
  });

  it('submits the email and code, then navigates to the reset page with the resetToken', async () => {
    adminApi.verifyPasswordResetOtp.mockResolvedValueOnce({ resetToken: 'reset-tok-1' });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/recovery code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    expect(adminApi.verifyPasswordResetOtp).toHaveBeenCalledWith('manager@trackme.com', '123456');
    expect(await screen.findByText('Reset password page')).toBeInTheDocument();
  });

  it('recovers the email from sessionStorage after a refresh loses router state (issue #55)', () => {
    sessionStorage.setItem('forgot-password-flow', JSON.stringify({ email: 'manager@trackme.com' }));
    renderPage({});

    expect(screen.getByLabelText(/email/i)).toHaveValue('manager@trackme.com');
  });

  it('persists the resetToken to sessionStorage on a successful verify, alongside the email', async () => {
    adminApi.verifyPasswordResetOtp.mockResolvedValueOnce({ resetToken: 'reset-tok-1' });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/recovery code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    await screen.findByText('Reset password page');
    expect(JSON.parse(sessionStorage.getItem('forgot-password-flow'))).toEqual({
      email: 'manager@trackme.com',
      resetToken: 'reset-tok-1',
    });
  });

  it('shows the server error message on failure', async () => {
    adminApi.verifyPasswordResetOtp.mockRejectedValueOnce(new Error('Invalid or expired code'));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/recovery code/i), '999999');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    expect(await screen.findByText('Invalid or expired code')).toBeInTheDocument();
  });

  it('resends the code and starts a cooldown, disabling the resend button (issue #56)', async () => {
    vi.useFakeTimers();
    try {
      adminApi.requestPasswordResetOtp.mockResolvedValueOnce({});
      renderPage();

      const resendButton = screen.getByRole('button', { name: /resend code/i });
      expect(resendButton).not.toBeDisabled();

      await act(async () => {
        fireEvent.click(resendButton);
      });

      expect(adminApi.requestPasswordResetOtp).toHaveBeenCalledWith('manager@trackme.com');
      expect(screen.getByText(/a new code has been sent/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /resend code \(30s\)/i })).toBeDisabled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(screen.getByRole('button', { name: /resend code \(29s\)/i })).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows an error inline if resending the code fails', async () => {
    adminApi.requestPasswordResetOtp.mockRejectedValueOnce(new Error('Too many requests'));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /resend code/i }));

    expect(await screen.findByText('Too many requests')).toBeInTheDocument();
  });
});
