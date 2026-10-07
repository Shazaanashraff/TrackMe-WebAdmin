import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { ManagerSettingsPage } from '../ManagerSettingsPage';
import { adminApi } from '@/api';

vi.mock('@/hooks/use-profile', () => ({ useUpdateOwnProfile: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/api', () => ({
  adminApi: {
    getManagerAssignableRoutes: vi.fn(),
    getRoute: vi.fn(),
    setManagerRouteQr: vi.fn(),
  },
}));

const USER = { _id: 'mgr-1', name: 'Manager User', email: 'manager@trackme.com', role: 'admin' };

// The list endpoint carries no owner or QR state; the detail endpoint has both.
const ROUTES = {
  'GVC-MORNING': { routeId: 'GVC-MORNING', routeName: 'Morning school run', managerId: 'mgr-1', qrEnabled: true },
  'HBT-EAST': { routeId: 'HBT-EAST', routeName: 'Office shuttle east', managerId: 'mgr-1', qrEnabled: false },
  'PUB-138': { routeId: 'PUB-138', routeName: 'Public 138', managerId: null, qrEnabled: false },
};

function mockRoutes(routes = ROUTES) {
  adminApi.getManagerAssignableRoutes.mockResolvedValue({
    success: true,
    data: Object.values(routes).map(({ routeId, routeName }) => ({ routeId, routeName })),
  });
  adminApi.getRoute.mockImplementation(async (routeId) => ({ success: true, data: routes[routeId] }));
}

function setup(user = USER) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Routes>
          <Route element={<Outlet context={{ user, onUserUpdate: vi.fn() }} />}>
            <Route path="/" element={<ManagerSettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { user: userEvent.setup() };
}

describe('ManagerSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoutes();
  });

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

describe('ManagerSettingsPage: QR boarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoutes();
  });

  it('shows one switch per route the manager owns, set to its current state', async () => {
    setup();
    expect(await screen.findByRole('switch', { name: 'QR boarding for Morning school run' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'QR boarding for Office shuttle east' })).not.toBeChecked();
    // A public route is listed as assignable but only its owner can switch it.
    expect(screen.queryByRole('switch', { name: 'QR boarding for Public 138' })).toBeNull();
  });

  it('saves a toggle through the manager endpoint and shows the new state', async () => {
    adminApi.setManagerRouteQr.mockResolvedValue({ success: true, data: { routeId: 'HBT-EAST', qrEnabled: true } });
    const { user } = setup();
    const sw = await screen.findByRole('switch', { name: 'QR boarding for Office shuttle east' });

    await user.click(sw);

    expect(adminApi.setManagerRouteQr).toHaveBeenCalledWith('HBT-EAST', true);
    await waitFor(() => expect(sw).toBeChecked());
  });

  it('keeps the switch where it was and says so when the save fails', async () => {
    adminApi.setManagerRouteQr.mockRejectedValue(new Error('Route not found or not owned by this manager'));
    const { user } = setup();
    const sw = await screen.findByRole('switch', { name: 'QR boarding for Morning school run' });

    await user.click(sw);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Could not save QR boarding',
      { description: 'Route not found or not owned by this manager' }
    ));
    expect(sw).toBeChecked();
  });

  it('says so when the manager owns no routes', async () => {
    mockRoutes({ 'PUB-138': ROUTES['PUB-138'] });
    setup();
    expect(await screen.findByText('You have no routes of your own yet.')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
