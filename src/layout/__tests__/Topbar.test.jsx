import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ColorModeProvider } from '@/theme/ColorMode';
import { Topbar } from '../Topbar';
import { SUPER_ADMIN_NAV, MANAGER_NAV } from '../AppShell';

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderTopbar({
  role = 'super-admin',
  path = '/dashboard',
  onLogout,
  onRefresh,
  onMobileMenuOpen,
} = {}) {
  const user = { role, email: 'admin@trackme.com', name: 'Zara Admin' };
  const navItems = role === 'super-admin' ? SUPER_ADMIN_NAV : MANAGER_NAV;
  return render(
    <QueryClientProvider client={makeClient()}>
      <ColorModeProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              path="*"
              element={
                <Topbar
                  user={user}
                  navItems={navItems}
                  onLogout={onLogout ?? vi.fn()}
                  onRefresh={onRefresh ?? vi.fn()}
                  onMobileMenuOpen={onMobileMenuOpen ?? vi.fn()}
                />
              }
            />
          </Routes>
        </MemoryRouter>
      </ColorModeProvider>
    </QueryClientProvider>,
  );
}

describe('Topbar', () => {
  beforeEach(() => localStorage.clear());

  it('shows the correct breadcrumb for the current route', () => {
    renderTopbar({ path: '/dashboard' });
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows manager breadcrumb root for manager role', () => {
    renderTopbar({ role: 'admin', path: '/manager/route-approvals' });
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getByText('Route Approvals')).toBeInTheDocument();
  });

  it('derives a label from the pathname when no exact match exists', () => {
    renderTopbar({ path: '/unknown-page' });
    expect(screen.getByText('Unknown Page')).toBeInTheDocument();
  });

  it('renders theme toggle and flips between light and dark', async () => {
    const user = userEvent.setup();
    renderTopbar();
    const toggle = screen.getByRole('button', { name: /switch to dark mode/i });
    await user.click(toggle);
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
  });

  it('calls onRefresh when the refresh button is clicked', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    renderTopbar({ onRefresh });
    await user.click(screen.getByRole('button', { name: 'Refresh data' }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('calls onMobileMenuOpen when the hamburger is clicked', async () => {
    const user = userEvent.setup();
    const onMobileMenuOpen = vi.fn();
    renderTopbar({ onMobileMenuOpen });
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(onMobileMenuOpen).toHaveBeenCalledOnce();
  });

  it('shows the user initial in the avatar trigger', () => {
    renderTopbar();
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('opens user dropdown and shows name, role, and sign-out', async () => {
    const user = userEvent.setup();
    renderTopbar();
    await user.click(screen.getByRole('button', { name: 'User menu' }));
    expect(screen.getByText('Zara Admin')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
  });

  it('calls onLogout when sign-out is selected from the user dropdown', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    renderTopbar({ onLogout });
    await user.click(screen.getByRole('button', { name: 'User menu' }));
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('opens the command dialog on the ⌘K button click', async () => {
    const user = userEvent.setup();
    renderTopbar();
    await user.click(screen.getByRole('button', { name: 'Open command menu' }));
    expect(screen.getByPlaceholderText('Search pages…')).toBeInTheDocument();
  });

  it('opens the command dialog on Ctrl+K keyboard shortcut', async () => {
    const user = userEvent.setup();
    renderTopbar();
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByPlaceholderText('Search pages…')).toBeInTheDocument();
  });

  it('lists navigate items in the command menu', async () => {
    const user = userEvent.setup();
    renderTopbar({ path: '/dashboard' });
    await user.click(screen.getByRole('button', { name: 'Open command menu' }));
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Managers' })).toBeInTheDocument();
    });
  });
});
