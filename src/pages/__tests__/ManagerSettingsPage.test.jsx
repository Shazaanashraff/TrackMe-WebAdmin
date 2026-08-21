import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { ManagerSettingsPage } from '../ManagerSettingsPage';

vi.mock('@/hooks/use-profile', () => ({ useUpdateOwnProfile: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })) }));

const USER = { name: 'Manager User', email: 'manager@trackme.com', role: 'admin' };

function setup(user = USER) {
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<Outlet context={{ user, onUserUpdate: vi.fn() }} />}>
          <Route path="/" element={<ManagerSettingsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ManagerSettingsPage', () => {
  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
  });

  it('renders the account settings panel with the current user', () => {
    setup();
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Manager User');
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('manager@trackme.com');
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('labels the not-yet-implemented items as coming soon, not "under development"', () => {
    setup();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.queryByText(/under development/i)).toBeNull();
  });

  it('does not show fabricated metric stats', () => {
    setup();
    expect(screen.queryByText('Manager Settings')).toBeNull();
  });
});
