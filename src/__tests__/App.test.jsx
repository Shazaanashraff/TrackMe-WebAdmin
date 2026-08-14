import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ColorModeProvider } from '../theme/ColorMode';
import App, { LoginShell } from '../App';
import { adminApi } from '../api';
import { writeStoredAuth, readStoredAuth } from '../lib/authSession';

// App.jsx owns the most important auth logic in the app: which route tree a
// role sees (ProtectedShell), login submission + role validation + post-login
// navigation (LoginShell), session hydration/silent-refresh on load, and
// logout. Every page component it routes to is stubbed out here so this file
// exercises ONLY that routing/auth logic, not each page's own data fetching.

vi.mock('../api', () => ({
  adminApi: {
    login: vi.fn(),
    refreshToken: vi.fn()
  }
}));

vi.mock('sonner', () => ({
  toast: vi.fn(),
  Toaster: () => null
}));

vi.mock('../pages/DashboardPage', () => ({ DashboardPage: () => <div>dashboard-stub</div> }));
vi.mock('../pages/ManagersPage', () => ({ ManagersPage: () => <div>managers-stub</div> }));
vi.mock('../pages/OperationsPage', () => ({ OperationsPage: () => <div>operations-stub</div> }));
vi.mock('../pages/RoutesPage', () => ({ RoutesPage: () => <div>routes-stub</div> }));
vi.mock('../pages/SettingsPage', () => ({ SettingsPage: () => <div>settings-stub</div> }));
vi.mock('../pages/ManagerDashboardPage', () => ({
  ManagerDashboardPage: () => <div>manager-dashboard-stub</div>
}));
vi.mock('../pages/ManagerVehiclesPage', () => ({
  ManagerVehiclesPage: () => <div>manager-vehicles-stub</div>
}));
vi.mock('../pages/ManagerTrackingPage', () => ({
  ManagerTrackingPage: () => <div>manager-tracking-stub</div>
}));
vi.mock('../pages/ManagerAccountsPage', () => ({
  ManagerAccountsPage: () => <div>manager-accounts-stub</div>
}));
vi.mock('../pages/ManagerSettingsPage', () => ({
  ManagerSettingsPage: () => <div>manager-settings-stub</div>
}));
vi.mock('../pages/StyleGuidePage', () => ({ StyleGuidePage: () => <div>styleguide-stub</div> }));

function renderApp(initialPath = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ColorModeProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <App />
        </MemoryRouter>
      </ColorModeProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.clearAllMocks();
});

describe('App — unauthenticated', () => {
  it('shows the login form when there is no stored session', async () => {
    renderApp('/dashboard');

    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});

describe('App — LoginShell', () => {
  it('logs a super-admin in and navigates to the super-admin dashboard', async () => {
    adminApi.login.mockResolvedValueOnce({
      token: 'sa-token',
      user: { role: 'super-admin', email: 'admin@trackme.com' }
    });
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(await screen.findByLabelText(/^Manager Email/i), 'admin@trackme.com');
    await user.type(screen.getByLabelText(/^Password/), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('dashboard-stub')).toBeInTheDocument();
    expect(readStoredAuth().user.role).toBe('super-admin');
  });

  it('logs a manager in and navigates to the manager dashboard', async () => {
    adminApi.login.mockResolvedValueOnce({
      token: 'mgr-token',
      user: { role: 'admin', email: 'manager@trackme.com' }
    });
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(await screen.findByLabelText(/^Manager Email/i), 'manager@trackme.com');
    await user.type(screen.getByLabelText(/^Password/), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('manager-dashboard-stub')).toBeInTheDocument();
  });

  it('rejects a login response for a role this portal does not serve, without storing a session', async () => {
    adminApi.login.mockResolvedValueOnce({
      token: 'rider-token',
      user: { role: 'rider', email: 'rider@trackme.com' }
    });
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(await screen.findByLabelText(/^Manager Email/i), 'rider@trackme.com');
    await user.type(screen.getByLabelText(/^Password/), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/reserved for authorized trackme administrative accounts/i)).toBeInTheDocument();
    expect(readStoredAuth()).toBeNull();
  });

  it('shows the backend error message when login itself fails', async () => {
    adminApi.login.mockRejectedValueOnce(new Error('Invalid email or password'));
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(await screen.findByLabelText(/^Manager Email/i), 'nobody@trackme.com');
    await user.type(screen.getByLabelText(/^Password/), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('redirects an already-authenticated super-admin away from /login to their dashboard', async () => {
    writeStoredAuth({ token: 'sa-token', user: { role: 'super-admin' } }, true);

    renderApp('/login');

    expect(await screen.findByText('dashboard-stub')).toBeInTheDocument();
  });
});

describe('App — ProtectedShell role scoping', () => {
  it('a manager cannot reach a super-admin-only path — sees NotFound instead', async () => {
    writeStoredAuth({ token: 'mgr-token', user: { role: 'admin' } }, true);

    renderApp('/dashboard');

    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(screen.queryByText('dashboard-stub')).not.toBeInTheDocument();
  });

  it('a super-admin cannot reach a manager-only path — sees NotFound instead', async () => {
    writeStoredAuth({ token: 'sa-token', user: { role: 'super-admin' } }, true);

    renderApp('/manager/dashboard');

    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(screen.queryByText('manager-dashboard-stub')).not.toBeInTheDocument();
  });

  it('a manager sees their own dashboard at their own route', async () => {
    writeStoredAuth({ token: 'mgr-token', user: { role: 'admin' } }, true);

    renderApp('/manager/dashboard');

    expect(await screen.findByText('manager-dashboard-stub')).toBeInTheDocument();
  });

  it('a manager can reach the live tracking route', async () => {
    writeStoredAuth({ token: 'mgr-token', user: { role: 'admin' } }, true);

    renderApp('/manager/tracking');

    expect(await screen.findByText('manager-tracking-stub')).toBeInTheDocument();
  });
});

describe('App — session hydration on load', () => {
  it('silently refreshes a stored session that has a refreshToken, and persists the new token', async () => {
    writeStoredAuth(
      { token: 'stale-token', refreshToken: 'refresh-1', user: { role: 'super-admin' } },
      true
    );
    adminApi.refreshToken.mockResolvedValueOnce({ token: 'fresh-token', accessToken: 'fresh-token' });

    renderApp('/dashboard');

    await waitFor(() => expect(adminApi.refreshToken).toHaveBeenCalledWith('refresh-1'));
    await waitFor(() => expect(readStoredAuth().token).toBe('fresh-token'));
    expect(await screen.findByText('dashboard-stub')).toBeInTheDocument();
  });

  it('logs the user out when the refresh call is genuinely rejected (401/403)', async () => {
    writeStoredAuth(
      { token: 'stale-token', refreshToken: 'dead-refresh', user: { role: 'super-admin' } },
      true
    );
    const rejection = new Error('Refresh token expired');
    rejection.status = 401;
    adminApi.refreshToken.mockRejectedValueOnce(rejection);

    renderApp('/dashboard');

    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(readStoredAuth()).toBeNull();
  });

  it('keeps the existing session when the refresh fails due to a network error (no status), instead of logging out', async () => {
    writeStoredAuth(
      { token: 'stale-token', refreshToken: 'refresh-1', user: { role: 'super-admin' } },
      true
    );
    adminApi.refreshToken.mockRejectedValueOnce(new Error('Failed to fetch')); // no .status

    renderApp('/dashboard');

    expect(await screen.findByText('dashboard-stub')).toBeInTheDocument();
    expect(readStoredAuth()).not.toBeNull();
  });

  it('shows a restoring-session loading state while a pending refresh call is in flight', async () => {
    writeStoredAuth(
      { token: 'stale-token', refreshToken: 'refresh-1', user: { role: 'super-admin' } },
      true
    );
    let resolveRefresh;
    adminApi.refreshToken.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );

    renderApp('/dashboard');

    expect(screen.getByText(/restoring session/i)).toBeInTheDocument();

    resolveRefresh({ token: 'fresh-token', accessToken: 'fresh-token' });
    expect(await screen.findByText('dashboard-stub')).toBeInTheDocument();
  });
});

describe('App — logout', () => {
  it('clears the session and returns to the login screen when Sign out is clicked', async () => {
    writeStoredAuth({ token: 'sa-token', user: { role: 'super-admin', email: 'admin@trackme.com' } }, true);
    const user = userEvent.setup();
    renderApp('/dashboard');

    await screen.findByText('dashboard-stub');
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(readStoredAuth()).toBeNull();
  });
});

describe('LoginShell — session-expired message via query param (issue #46)', () => {
  function renderLoginShell(initialEntry = '/login') {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <LoginShell auth={null} setAuth={vi.fn()} />
      </MemoryRouter>
    );
  }

  it('shows no message by default', () => {
    renderLoginShell('/login');
    expect(screen.queryByText(/session expired/i)).not.toBeInTheDocument();
  });

  it('shows a session-expired message when redirected here after a dead session', () => {
    renderLoginShell('/login?reason=session_expired');
    expect(screen.getByText(/your session expired.*please sign in again/i)).toBeInTheDocument();
  });
});
