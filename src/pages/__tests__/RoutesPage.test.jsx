import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RoutesPage } from '../RoutesPage';

vi.mock('@/hooks/use-system-routes', () => ({
  useSystemRoutes: vi.fn(),
  useCreateSystemRoute: vi.fn(),
  useUpdateSystemRoute: vi.fn(),
  useToggleSystemRouteStatus: vi.fn(),
  useDeleteSystemRoute: vi.fn(),
}));
vi.mock('@/hooks/use-managers', () => ({
  useManagers: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import {
  useSystemRoutes, useCreateSystemRoute, useUpdateSystemRoute,
  useToggleSystemRouteStatus, useDeleteSystemRoute,
} from '@/hooks/use-system-routes';
import { useManagers } from '@/hooks/use-managers';

const ROUTE_W = { _id: 'r1', routeId: 'RT-001', routeName: 'Colombo–Kandy', source: 'Colombo', destination: 'Kandy', distance: 115, fare: 350, serviceType: 'PUBLIC', stopsCount: 3, isActive: true, province: 'Western' };
const ROUTE_C = { _id: 'r2', routeId: 'RT-002', routeName: 'Galle–Matara', source: 'Galle', destination: 'Matara', serviceType: 'PUBLIC', stopsCount: 0, isActive: true, province: 'Central' };
const ROUTE_NONE = { _id: 'r3', routeId: 'RT-003', routeName: 'Orphan Route', source: 'A', destination: 'B', serviceType: 'PUBLIC', stopsCount: 0, isActive: false, province: '' };

const MANAGER_W = { _id: 'm1', name: 'Western Province Manager', email: 'western.manager@trackme.com', serviceType: 'PUBLIC', province: 'Western' };
const MANAGER_C = { _id: 'm2', name: 'Central Province Manager', email: 'central.manager@trackme.com', serviceType: 'PUBLIC', province: 'Central' };

function makeMutation(overrides = {}) {
  return {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    ...overrides,
  };
}

function defaultHooks({
  routes = [ROUTE_W, ROUTE_C], loading = false, error = null, createMut, managers = [MANAGER_W, MANAGER_C],
  updateMut, toggleMut, deleteMut,
} = {}) {
  useSystemRoutes.mockReturnValue({ data: { data: routes }, isLoading: loading, error, refetch: vi.fn() });
  useCreateSystemRoute.mockReturnValue(createMut || makeMutation());
  useUpdateSystemRoute.mockReturnValue(updateMut || makeMutation());
  useToggleSystemRouteStatus.mockReturnValue(toggleMut || makeMutation());
  useDeleteSystemRoute.mockReturnValue(deleteMut || makeMutation());
  useManagers.mockReturnValue({ data: { data: managers }, isLoading: false, error: null });
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

  it('shows each province manager\'s real registered email, not a guessed formula (issue #16)', () => {
    setup();
    expect(screen.getByText('western.manager@trackme.com')).toBeInTheDocument();
    expect(screen.getByText('central.manager@trackme.com')).toBeInTheDocument();
  });

  it('falls back to a plain message when no manager is assigned to a province', () => {
    setup({ managers: [MANAGER_W] });
    expect(screen.getAllByText('No manager assigned').length).toBeGreaterThan(0);
    expect(screen.queryByText(/central\.manager@trackme\.com/i)).toBeNull();
  });

  it('shows the drilled-in province\'s real manager email in the header', async () => {
    const { user } = setup();
    await user.click(screen.getByText('Western Province').closest('button'));
    expect(await screen.findByText('western.manager@trackme.com')).toBeInTheDocument();
  });

  it('shows unassigned section when routes have no province', () => {
    setup({ routes: [ROUTE_W, ROUTE_NONE] });
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('matches a lowercase province value to its correct province card instead of Unassigned (issue #60)', () => {
    const routeLowercase = { ...ROUTE_C, _id: 'r-lower', province: 'central' };
    setup({ routes: [ROUTE_W, routeLowercase] });
    const centralRow = screen.getByText('Central Province').closest('button');
    expect(within(centralRow).getByText('1 routes')).toBeInTheDocument();
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
  });

  it('matches a "<Name> Province"-suffixed value to its correct province card (issue #60)', () => {
    const routeSuffixed = { ...ROUTE_C, _id: 'r-suffixed', province: 'Western Province' };
    setup({ routes: [routeSuffixed] });
    const westernRow = screen.getByText('Western Province').closest('button');
    expect(within(westernRow).getByText('1 routes')).toBeInTheDocument();
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
  });

  it('still falls into Unassigned for a province value that matches no known province', () => {
    const routeBogus = { ...ROUTE_C, _id: 'r-bogus', province: 'Atlantis' };
    setup({ routes: [routeBogus] });
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('drills into a differently-cased province and shows its routes (issue #60)', async () => {
    const routeLowercase = { ...ROUTE_C, _id: 'r-lower', province: 'CENTRAL' };
    const { user } = setup({ routes: [routeLowercase] });
    await user.click(screen.getByText('Central Province').closest('button'));
    expect(await screen.findByText('Galle–Matara')).toBeInTheDocument();
  });

  it('drills into province on click and shows route rows', async () => {
    const { user } = setup();
    await user.click(screen.getByText('Western Province').closest('button'));
    expect(await screen.findByText('Colombo–Kandy')).toBeInTheDocument();
    expect(screen.getByText('Western Province')).toBeInTheDocument();
  });

  it('shows the DataTable\'s specific empty message for a province with zero routes, not a generic one (issue #73)', async () => {
    const { user } = setup();
    await user.click(screen.getByText('Southern Province').closest('button'));
    expect(await screen.findByText('No routes for this province')).toBeInTheDocument();
    expect(screen.queryByText('No routes')).not.toBeInTheDocument();
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

  it('rejects a non-numeric distance value instead of silently submitting NaN (issue #74)', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/route id/i), 'RT-X');
    await user.type(screen.getByLabelText(/route name/i), 'Test Route');
    await user.type(screen.getByLabelText(/source/i), 'A');
    await user.type(screen.getByLabelText(/destination/i), 'B');
    // type="number" doesn't always block every non-numeric value a browser can
    // set (e.g. via paste) — fireEvent.change bypasses userEvent's normal typing
    // simulation to exercise that path directly.
    fireEvent.change(screen.getByLabelText(/distance/i), { target: { value: 'abc' } });
    await user.type(screen.getByLabelText(/fare/i), '100');
    await user.click(screen.getByRole('button', { name: /create route/i }));

    expect(await screen.findByText(/distance must be a positive number/i)).toBeInTheDocument();
  });

  it('rejects a non-numeric fare value instead of silently submitting NaN', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/route id/i), 'RT-X');
    await user.type(screen.getByLabelText(/route name/i), 'Test Route');
    await user.type(screen.getByLabelText(/source/i), 'A');
    await user.type(screen.getByLabelText(/destination/i), 'B');
    await user.type(screen.getByLabelText(/distance/i), '10');
    fireEvent.change(screen.getByLabelText(/fare/i), { target: { value: 'xyz' } });
    await user.click(screen.getByRole('button', { name: /create route/i }));

    expect(await screen.findByText(/fare must be a positive number/i)).toBeInTheDocument();
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

  it('defaults QR attendance to disabled and includes it in the create payload when enabled', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });

    expect(screen.getByLabelText(/enable qr attendance/i)).not.toBeChecked();

    await user.type(screen.getByLabelText(/route id/i), 'RT-QR-01');
    await user.type(screen.getByLabelText(/route name/i), 'QR Route');
    await user.type(screen.getByLabelText(/source/i), 'A');
    await user.type(screen.getByLabelText(/destination/i), 'B');
    await user.type(screen.getByLabelText(/distance/i), '12');
    await user.type(screen.getByLabelText(/fare/i), '60');
    await user.click(screen.getByLabelText(/enable qr attendance/i));
    await user.click(screen.getByRole('button', { name: /create route/i }));

    await waitFor(() => {
      expect(createMut.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ routeId: 'RT-QR-01', qrEnabled: true }),
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

  it('keeps a stop\'s own values attached to it (not its position) after reordering (issue #17)', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /add stop/i }));
    await user.click(screen.getByRole('button', { name: /add stop/i }));
    await user.type(screen.getByLabelText(/stop 1 name/i), 'First');
    await user.type(screen.getByLabelText(/stop 2 name/i), 'Second');

    // Move the second row up so "Second" is now row 1.
    const moveUpButtons = screen.getAllByRole('button', { name: /move up/i });
    await user.click(moveUpButtons[1]);

    expect(screen.getByLabelText(/stop 1 name/i)).toHaveValue('Second');
    expect(screen.getByLabelText(/stop 2 name/i)).toHaveValue('First');
  });

  it('keeps a validation error attached to the invalid stop after reordering, not to whatever is now in its old position (issue #17)', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /add stop/i }));
    await user.click(screen.getByRole('button', { name: /add stop/i }));
    // Stop 1 ("Bad") is left partially filled (no lat/lng) — invalid.
    // Stop 2 ("Good") is fully filled — valid.
    await user.type(screen.getByLabelText(/stop 1 name/i), 'Bad');
    await user.type(screen.getByLabelText(/stop 2 name/i), 'Good');
    await user.type(screen.getByLabelText(/stop 2 latitude/i), '6.9');
    await user.type(screen.getByLabelText(/stop 2 longitude/i), '79.8');

    await user.type(screen.getByLabelText(/route id/i), 'RT-X');
    await user.type(screen.getByLabelText(/route name/i), 'Test Route');
    await user.type(screen.getByLabelText(/source/i), 'A');
    await user.type(screen.getByLabelText(/destination/i), 'B');
    await user.type(screen.getByLabelText(/distance/i), '10');
    await user.type(screen.getByLabelText(/fare/i), '100');
    await user.click(screen.getByRole('button', { name: /create route/i }));
    await screen.findByText(/each stop must have/i);

    // Reorder so "Bad" (still invalid) is now in row 2's position.
    const moveDownButtons = screen.getAllByRole('button', { name: /move down/i });
    await user.click(moveDownButtons[0]);

    expect(screen.getByLabelText(/stop 1 name/i)).toHaveValue('Good');
    expect(screen.getByLabelText(/stop 2 name/i)).toHaveValue('Bad');
    expect(screen.getByLabelText(/stop 1 name/i)).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByLabelText(/stop 2 name/i)).toHaveAttribute('aria-invalid', 'true');
  });

  // issue #39: RoutesPage had no Edit, Deactivate/Activate, or Delete action.
  describe('row actions (issue #39)', () => {
    async function drillIntoWestern(opts) {
      const { user } = setup(opts);
      await user.click(screen.getByText('Western Province').closest('button'));
      await screen.findByText('Colombo–Kandy');
      return { user };
    }

    it('opens the edit dialog pre-filled with the route\'s current values', async () => {
      const { user } = await drillIntoWestern();
      await user.click(screen.getByRole('button', { name: /^edit$/i }));

      await screen.findByRole('heading', { name: /edit colombo–kandy/i });
      const dialog = within(screen.getByRole('dialog'));
      expect(dialog.getByLabelText(/route name/i)).toHaveValue('Colombo–Kandy');
      expect(dialog.getByLabelText(/source/i)).toHaveValue('Colombo');
      expect(dialog.getByLabelText(/destination/i)).toHaveValue('Kandy');
    });

    it('calls updateSystemRoute with the edited fields on save', async () => {
      const updateMut = makeMutation();
      const { user } = await drillIntoWestern({ updateMut });

      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      await screen.findByRole('heading', { name: /edit colombo–kandy/i });
      const dialog = within(screen.getByRole('dialog'));

      const destInput = dialog.getByLabelText(/destination/i);
      await user.clear(destInput);
      await user.type(destInput, 'Nuwara Eliya');
      await user.click(dialog.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(updateMut.mutateAsync).toHaveBeenCalledWith({
          routeId: 'RT-001',
          payload: expect.objectContaining({ destination: 'Nuwara Eliya' }),
        });
      });
    });

    it('calls toggleSystemRouteStatus when Deactivate is clicked', async () => {
      const toggleMut = makeMutation();
      const { user } = await drillIntoWestern({ toggleMut });

      await user.click(screen.getByRole('button', { name: /deactivate/i }));

      await waitFor(() => {
        expect(toggleMut.mutateAsync).toHaveBeenCalledWith({ routeId: 'RT-001' });
      });
    });

    it('shows Activate for an already-inactive route', async () => {
      const inactiveRoute = { ...ROUTE_W, isActive: false };
      await drillIntoWestern({ routes: [inactiveRoute, ROUTE_C] });
      expect(screen.getByRole('button', { name: /^activate$/i })).toBeInTheDocument();
    });

    it('shows a persistent row error when a status toggle fails', async () => {
      const toggleMut = makeMutation({ mutateAsync: vi.fn().mockRejectedValue(new Error('Route not found')) });
      const { user } = await drillIntoWestern({ toggleMut });

      await user.click(screen.getByRole('button', { name: /deactivate/i }));
      expect(await screen.findByText('Route not found')).toBeInTheDocument();
    });

    it('confirms before deleting, then calls deleteSystemRoute', async () => {
      const deleteMut = makeMutation();
      const { user } = await drillIntoWestern({ deleteMut });

      await user.click(screen.getByRole('button', { name: /^delete$/i }));
      expect(await screen.findByText(/delete colombo–kandy/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /delete route/i }));

      await waitFor(() => {
        expect(deleteMut.mutateAsync).toHaveBeenCalledWith({ routeId: 'RT-001' });
      });
    });

    it('does not delete without confirming', async () => {
      const deleteMut = makeMutation();
      const { user } = await drillIntoWestern({ deleteMut });

      await user.click(screen.getByRole('button', { name: /^delete$/i }));
      await screen.findByText(/delete colombo–kandy/i);
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(deleteMut.mutateAsync).not.toHaveBeenCalled();
    });
  });
});
