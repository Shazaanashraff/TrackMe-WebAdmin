import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RoutesPage } from '../RoutesPage';

vi.mock('@/hooks/use-system-routes', () => ({
  useSystemRoutes: vi.fn(),
  useCreateSystemRoute: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import { useSystemRoutes, useCreateSystemRoute } from '@/hooks/use-system-routes';

const ROUTE_W = { _id: 'r1', routeId: 'RT-001', routeName: 'Colombo–Kandy', source: 'Colombo', destination: 'Kandy', serviceType: 'PUBLIC', stopsCount: 3, isActive: true, province: 'Western' };
const ROUTE_C = { _id: 'r2', routeId: 'RT-002', routeName: 'Galle–Matara', source: 'Galle', destination: 'Matara', serviceType: 'PUBLIC', stopsCount: 0, isActive: true, province: 'Central' };
const ROUTE_NONE = { _id: 'r3', routeId: 'RT-003', routeName: 'Orphan Route', source: 'A', destination: 'B', serviceType: 'PUBLIC', stopsCount: 0, isActive: false, province: '' };

function makeMutation(overrides = {}) {
  return {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    ...overrides,
  };
}

function defaultHooks({ routes = [ROUTE_W, ROUTE_C], loading = false, error = null, createMut } = {}) {
  useSystemRoutes.mockReturnValue({ data: { data: routes }, isLoading: loading, error, refetch: vi.fn() });
  useCreateSystemRoute.mockReturnValue(createMut || makeMutation());
}

function setup(opts = {}) {
  defaultHooks(opts);
  const user = userEvent.setup();
  render(<MemoryRouter><RoutesPage /></MemoryRouter>);
  return { user };
}

describe('RoutesPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /route management/i })).toBeInTheDocument();
  });

  it('renders the create route form with required fields', () => {
    setup();
    expect(screen.getByLabelText(/route id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/route name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/distance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fare/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create route/i })).toBeInTheDocument();
  });

  it('shows loading skeleton state', () => {
    setup({ loading: true, routes: [] });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shows all 9 province rows in the list', () => {
    setup();
    expect(screen.getByText('Western Province')).toBeInTheDocument();
    expect(screen.getByText('Central Province')).toBeInTheDocument();
    expect(screen.getByText('Southern Province')).toBeInTheDocument();
    expect(screen.getByText('Northern Province')).toBeInTheDocument();
  });

  it('shows route counts per province', () => {
    setup();
    // Western has 1 route, Central has 1 route
    const westernRow = screen.getByText('Western Province').closest('button');
    expect(within(westernRow).getByText('1 routes')).toBeInTheDocument();
  });

  it('shows routes by province manager subtitle', () => {
    setup();
    expect(screen.getByText(/routes by province manager/i)).toBeInTheDocument();
  });

  it('shows unassigned section when routes have no province', () => {
    setup({ routes: [ROUTE_W, ROUTE_NONE] });
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('drills into province on click and shows route rows', async () => {
    const { user } = setup();
    await user.click(screen.getByText('Western Province').closest('button'));
    expect(await screen.findByText('Colombo–Kandy')).toBeInTheDocument();
    expect(screen.getByText('Western Province')).toBeInTheDocument();
  });

  it('returns to province list when "All provinces" is clicked', async () => {
    const { user } = setup();
    await user.click(screen.getByText('Western Province').closest('button'));
    await screen.findByText('Colombo–Kandy');
    await user.click(screen.getByRole('button', { name: /all provinces/i }));
    expect(screen.getByText('Routes by Province Manager')).toBeInTheDocument();
  });

  it('validates required fields before submit', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /create route/i }));
    expect(await screen.findByText(/route id is required/i)).toBeInTheDocument();
  });

  it('validates stop fields when a partial stop is entered', async () => {
    const { user } = setup();
    // Add a stop then fill only the name (leaving lat/lng empty)
    await user.click(screen.getByRole('button', { name: /add stop/i }));
    await user.type(screen.getByLabelText(/stop 1 name/i), 'Midpoint');
    // Fill route required fields so we get to stop validation
    await user.type(screen.getByLabelText(/route id/i), 'RT-X');
    await user.type(screen.getByLabelText(/route name/i), 'Test Route');
    await user.type(screen.getByLabelText(/source/i), 'A');
    await user.type(screen.getByLabelText(/destination/i), 'B');
    await user.type(screen.getByLabelText(/distance/i), '10');
    await user.type(screen.getByLabelText(/fare/i), '100');
    await user.click(screen.getByRole('button', { name: /create route/i }));
    expect(await screen.findByText(/each stop must have/i)).toBeInTheDocument();
  });

  it('calls createSystemRoute mutation with correct payload', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });

    await user.type(screen.getByLabelText(/route id/i), 'RT-NW-01');
    await user.type(screen.getByLabelText(/route name/i), 'Colombo–Negombo');
    await user.type(screen.getByLabelText(/source/i), 'Colombo');
    await user.type(screen.getByLabelText(/destination/i), 'Negombo');
    await user.type(screen.getByLabelText(/distance/i), '37');
    await user.type(screen.getByLabelText(/fare/i), '120');
    await user.click(screen.getByRole('button', { name: /create route/i }));

    await waitFor(() => {
      expect(createMut.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          routeId: 'RT-NW-01',
          routeName: 'Colombo–Negombo',
          source: 'Colombo',
          destination: 'Negombo',
          distance: 37,
          fare: 120,
          serviceType: 'PUBLIC',
          stops: [],
          stopsCount: 0,
        }),
      );
    });
  });

  it('resets form after successful create', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });

    await user.type(screen.getByLabelText(/route id/i), 'RT-TMP');
    await user.type(screen.getByLabelText(/route name/i), 'Temp Route');
    await user.type(screen.getByLabelText(/source/i), 'X');
    await user.type(screen.getByLabelText(/destination/i), 'Y');
    await user.type(screen.getByLabelText(/distance/i), '5');
    await user.type(screen.getByLabelText(/fare/i), '50');
    await user.click(screen.getByRole('button', { name: /create route/i }));

    await waitFor(() => expect(createMut.mutateAsync).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByLabelText(/route id/i)).toHaveValue('');
    });
  });

  it('can add and remove stops', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /add stop/i }));
    expect(screen.getByLabelText(/stop 1 name/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove stop/i }));
    expect(screen.queryByLabelText(/stop 1 name/i)).toBeNull();
  });
});
