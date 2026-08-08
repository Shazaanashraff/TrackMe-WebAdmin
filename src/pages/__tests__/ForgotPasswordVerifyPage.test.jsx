import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ForgotPasswordVerifyPage } from '../ForgotPasswordVerifyPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    verifyPasswordResetOtp: vi.fn(),
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

  it('shows the server error message on failure', async () => {
    adminApi.verifyPasswordResetOtp.mockRejectedValueOnce(new Error('Invalid or expired code'));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/recovery code/i), '999999');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    expect(await screen.findByText('Invalid or expired code')).toBeInTheDocument();
  });
});
