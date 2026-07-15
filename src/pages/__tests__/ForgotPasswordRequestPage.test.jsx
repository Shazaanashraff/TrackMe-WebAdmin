import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPasswordRequestPage } from '../ForgotPasswordRequestPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    requestPasswordResetOtp: vi.fn(() => Promise.resolve({}))
  }
}));

describe('ForgotPasswordRequestPage', () => {
  it('matches the sign-in page design (dark background, blue accent) and submits the email', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ForgotPasswordRequestPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Reset your password')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), 'manager@trackme.com');
    await user.click(screen.getByRole('button', { name: /send recovery code/i }));

    expect(adminApi.requestPasswordResetOtp).toHaveBeenCalledWith('manager@trackme.com');
  });

  it('shows the server error message on failure', async () => {
    adminApi.requestPasswordResetOtp.mockRejectedValueOnce(new Error('No account with that email'));
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ForgotPasswordRequestPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'nobody@trackme.com');
    await user.click(screen.getByRole('button', { name: /send recovery code/i }));

    expect(await screen.findByText('No account with that email')).toBeInTheDocument();
  });
});
