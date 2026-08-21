import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { SettingsPage } from '../SettingsPage';

vi.mock('@/hooks/use-profile', () => ({ useUpdateOwnProfile: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })) }));

const USER = { name: 'Admin User', email: 'admin@trackme.com', role: 'super-admin' };

function setup(user = USER) {
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<Outlet context={{ user, onUserUpdate: vi.fn() }} />}>
          <Route path="/" element={<SettingsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('SettingsPage', () => {
  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
  });

  it('renders the account settings panel with the current user', () => {
    setup();
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Admin User');
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('admin@trackme.com');
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('labels the not-yet-implemented items as coming soon, not "under development"', () => {
    setup();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.queryByText(/settings configuration is under development/i)).toBeNull();
  });

  it('does not show any fabricated metric numbers', () => {
    setup();
    expect(screen.queryByText('Security Policies')).toBeNull();
    expect(screen.queryByText('Active Alerts')).toBeNull();
    expect(screen.queryByText('Recommended Actions')).toBeNull();
  });
});
