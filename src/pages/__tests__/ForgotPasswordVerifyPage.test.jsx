import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ForgotPasswordVerifyPage } from '../ForgotPasswordVerifyPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    verifyPasswordResetOtp: vi.fn()
  }
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <pre data-testid="location-state">{JSON.stringify(location.state)}</pre>
  );
}

function renderAt(path, state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path="/forgot-password/verify" element={<ForgotPasswordVerifyPage />} />
        <Route path="/forgot-password" element={<div>Request page</div>} />
        <Route path="/forgot-password/reset" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ForgotPasswordVerifyPage', () => {
  it('pre-fills the email from router state and submits email + otp', async () => {
    adminApi.verifyPasswordResetOtp.mockResolvedValueOnce({ resetToken: 'reset-tok-1' });
    const user = userEvent.setup();

    renderAt('/forgot-password/verify', { email: 'manager@trackme.com' });

    expect(screen.getByLabelText(/email/i)).toHaveValue('manager@trackme.com');

    await user.type(screen.getByLabelText(/recovery code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    expect(adminApi.verifyPasswordResetOtp).toHaveBeenCalledWith('manager@trackme.com', '123456');
  });

  it('strips non-digit characters and caps the code at 6 digits', async () => {
    const user = userEvent.setup();
    renderAt('/forgot-password/verify', { email: 'manager@trackme.com' });

    const otpField = screen.getByLabelText(/recovery code/i);
    await user.type(otpField, '12a34b56789');

    expect(otpField).toHaveValue('123456');
  });

  it('navigates to the reset step carrying email and resetToken on success', async () => {
    adminApi.verifyPasswordResetOtp.mockResolvedValueOnce({ resetToken: 'reset-tok-1' });
    const user = userEvent.setup();

    renderAt('/forgot-password/verify', { email: 'manager@trackme.com' });
    await user.type(screen.getByLabelText(/recovery code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    const state = JSON.parse(await screen.findByTestId('location-state').then((el) => el.textContent));
    expect(state).toEqual({ email: 'manager@trackme.com', resetToken: 'reset-tok-1' });
  });

  it('shows the server error message on an invalid or expired code', async () => {
    adminApi.verifyPasswordResetOtp.mockRejectedValueOnce(new Error('Code expired'));
    const user = userEvent.setup();

    renderAt('/forgot-password/verify', { email: 'manager@trackme.com' });
    await user.type(screen.getByLabelText(/recovery code/i), '999999');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    expect(await screen.findByText('Code expired')).toBeInTheDocument();
  });

  it('navigates back to the request-email step, carrying the current email, when Back is clicked', async () => {
    const user = userEvent.setup();
    renderAt('/forgot-password/verify', { email: 'manager@trackme.com' });

    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(await screen.findByText('Request page')).toBeInTheDocument();
  });

  it('allows editing the email field even if it was pre-filled from router state', async () => {
    const user = userEvent.setup();
    renderAt('/forgot-password/verify', { email: 'manager@trackme.com' });

    const emailField = screen.getByLabelText(/email/i);
    await user.clear(emailField);
    await user.type(emailField, 'someone-else@trackme.com');

    expect(emailField).toHaveValue('someone-else@trackme.com');
  });
});
