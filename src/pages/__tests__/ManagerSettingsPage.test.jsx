import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ManagerSettingsPage } from '../ManagerSettingsPage';

vi.mock('../../api', () => ({
  adminApi: {
    changePassword: vi.fn(),
  },
}));

function setup() {
  render(<MemoryRouter><ManagerSettingsPage /></MemoryRouter>);
}

describe('ManagerSettingsPage', () => {
  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
  });

  it('renders a real change-password form, not a placeholder', () => {
    setup();
    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^current password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
  });

  it('does not show the old "under development" placeholder copy', () => {
    setup();
    expect(screen.queryByText(/under development/i)).toBeNull();
    expect(screen.queryByText('Profile')).toBeNull();
    expect(screen.queryByText('Notifications')).toBeNull();
    expect(screen.queryByText('Organization')).toBeNull();
  });
});
