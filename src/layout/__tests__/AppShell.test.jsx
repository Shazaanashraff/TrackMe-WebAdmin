import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ColorModeProvider } from '@/theme/ColorMode';
import { AppShell } from '../AppShell';

vi.mock('@/hooks/use-enrollment-requests', () => ({
  useEnrollmentRequestCount: vi.fn(() => ({ data: 0 })),
}));

import { useEnrollmentRequestCount } from '@/hooks/use-enrollment-requests';

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderShell({ role = 'super-admin', path = '/dashboard', onLogout, onRefresh } = {}) {
  const logout = onLogout ?? vi.fn();
  const refresh = onRefresh ?? vi.fn();
  return render(
    <QueryClientProvider client={makeClient()}>
      <ColorModeProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              element={
                <AppShell
                  user={{ role, email: 'test@trackme.com' }}
                  onLogout={logout}
                  onRefresh={refresh}
                />
              }
            >
              <Route path="/dashboard" element={<div>sa dashboard</div>} />
              <Route path="/managers" element={<div>managers page</div>} />
              <Route path="/manager/dashboard" element={<div>mgr dashboard</div>} />
              <Route path="/manager/route-approvals" element={<div>approvals page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ColorModeProvider>
    </QueryClientProvider>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset per test: mockReturnValue otherwise leaks a count into later cases.
    useEnrollmentRequestCount.mockReset();
    useEnrollmentRequestCount.mockReturnValue({ data: 0 });
  });

  it('renders super-admin nav links', () => {
    renderShell({ role: 'super-admin', path: '/dashboard' });
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Managers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Operations' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Routes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
  });

  it('renders manager nav links', () => {
    renderShell({ role: 'admin', path: '/manager/dashboard' });
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vehicles' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Drivers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Requests' })).toBeInTheDocument();
  });

  it('counts pending enrollment requests on the Requests link', () => {
    useEnrollmentRequestCount.mockReturnValue({ data: 3 });
    renderShell({ role: 'admin', path: '/manager/dashboard' });

    // The count is folded into the accessible name so it is not colour-only.
    const link = screen.getByRole('link', { name: 'Requests (3 pending)' });
    expect(link).toHaveTextContent('3');
  });

  it('leaves the Requests link unadorned when nothing is pending', () => {
    useEnrollmentRequestCount.mockReturnValue({ data: 0 });
    renderShell({ role: 'admin', path: '/manager/dashboard' });

    expect(screen.getByRole('link', { name: 'Requests' })).toBeInTheDocument();
  });

  it('does not ask for a manager count when a super-admin is signed in', () => {
    useEnrollmentRequestCount.mockReturnValue({ data: 0 });
    renderShell({ role: 'super-admin', path: '/dashboard' });

    expect(useEnrollmentRequestCount).toHaveBeenCalledWith({ enabled: false });
  });

  it('marks the active route with aria-current="page"', () => {
    renderShell({ role: 'super-admin', path: '/dashboard' });
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Managers' })).not.toHaveAttribute('aria-current');
  });

  it('shows TRACKME ADMIN wordmark for super-admin', () => {
    renderShell({ role: 'super-admin' });
    expect(screen.getByText('TRACKME ADMIN')).toBeInTheDocument();
  });

  it('shows TRACKME MGR wordmark for manager', () => {
    renderShell({ role: 'admin', path: '/manager/dashboard' });
    expect(screen.getByText('TRACKME MGR')).toBeInTheDocument();
  });

  it('collapses the sidebar and persists to localStorage', async () => {
    const user = userEvent.setup();
    renderShell();
    expect(screen.getByText('TRACKME ADMIN')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(screen.queryByText('TRACKME ADMIN')).not.toBeInTheDocument();
    expect(localStorage.getItem('webadmin-sidebar-collapsed')).toBe('true');
  });

  it('expands the sidebar and updates localStorage', async () => {
    const user = userEvent.setup();
    localStorage.setItem('webadmin-sidebar-collapsed', 'true');
    renderShell();
    expect(screen.queryByText('TRACKME ADMIN')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));

    expect(screen.getByText('TRACKME ADMIN')).toBeInTheDocument();
    expect(localStorage.getItem('webadmin-sidebar-collapsed')).toBe('false');
  });

  it('restores collapsed state from localStorage on mount', () => {
    localStorage.setItem('webadmin-sidebar-collapsed', 'true');
    renderShell();
    expect(screen.queryByText('TRACKME ADMIN')).not.toBeInTheDocument();
  });

  it('calls onLogout when the sign-out button is clicked', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    renderShell({ onLogout });
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('calls onRefresh when the refresh button is clicked', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    renderShell({ onRefresh });
    await user.click(screen.getByRole('button', { name: 'Refresh data' }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('toggles theme via the theme button', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('renders the outlet content', () => {
    renderShell({ path: '/dashboard' });
    expect(screen.getByText('sa dashboard')).toBeInTheDocument();
  });

  it('aside landmark has aria-label="Sidebar"', () => {
    renderShell();
    expect(screen.getByRole('complementary', { name: 'Sidebar' })).toBeInTheDocument();
  });

  it('nav landmark has aria-label="Main navigation"', () => {
    renderShell();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

});
