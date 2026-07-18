import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ManagerRouteApprovalsPage } from '../ManagerRouteApprovalsPage';

// react-leaflet needs real layout/ResizeObserver — stub with plain divs
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Polyline: () => null,
  Marker: () => null,
}));

vi.mock('@/hooks/use-route-approvals', () => ({
  useManagerCustomRoutes: vi.fn(),
  useRouteChangeRequests: vi.fn(),
  useNameCustomRoute: vi.fn(),
  useResolveRouteChangeRequest: vi.fn(),
}));

import {
  useManagerCustomRoutes,
  useRouteChangeRequests,
  useNameCustomRoute,
  useResolveRouteChangeRequest,
} from '@/hooks/use-route-approvals';

const RECORDED_ROUTE = {
  routeId: 'CUST-ABC123-1',
  distance: 4.2,
  stopsCount: 3,
  pathPolyline: '_p~iF~ps|U_ulLnnqC',
  stops: [{ lat: 6.9271, lng: 79.8612, stopName: 'Stop 1' }],
  recordedMeta: { snapped: true },
};

const PENDING_UNRECORDED_ROUTE = {
  routeId: 'CUST-ABC123-2',
  distance: 0,
  stopsCount: 0,
  pathPolyline: '',
};

const CHANGE_REQUEST = {
  _id: 'crq-1',
  currentRouteId: {
    routeId: 'CUST-ABC123-1',
    routeName: 'Morning School Run',
    pathPolyline: '_p~iF~ps|U_ulLnnqC',
    stops: [],
    distance: 4.2,
  },
  candidate: { pathPolyline: '_ulLnnqC_mqNvxq`@', stops: [], distance: 4.6, snapped: true },
  deviation: { maxMeters: 220, fractionOff: 0.5, sampleCount: 10 },
  status: 'PENDING',
};

function makeMutation(overrides = {}) {
  return { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, ...overrides };
}

function defaultHooks({
  routes = [], changeRequests = [], routesError = null, crError = null,
  nameMut, resolveMut,
} = {}) {
  useManagerCustomRoutes.mockReturnValue({
    data: { data: routes },
    isLoading: false,
    isError: Boolean(routesError),
    error: routesError,
  });
  useRouteChangeRequests.mockReturnValue({
    data: { data: changeRequests },
    isLoading: false,
    isError: Boolean(crError),
    error: crError,
  });
  useNameCustomRoute.mockReturnValue(nameMut || makeMutation());
  useResolveRouteChangeRequest.mockReturnValue(resolveMut || makeMutation());
}

function setup(opts) {
  defaultHooks(opts);
  render(<MemoryRouter><ManagerRouteApprovalsPage /></MemoryRouter>);
}

describe('ManagerRouteApprovalsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders recorded routes as reviewable and unrecorded ones separately', async () => {
    setup({ routes: [RECORDED_ROUTE, PENDING_UNRECORDED_ROUTE] });

    await waitFor(() => expect(screen.getByText('CUST-ABC123-1')).toBeTruthy());
    expect(screen.getByText('CUST-ABC123-2')).toBeTruthy();
    expect(screen.getByText(/awaiting driver recording/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /review & name/i })).toBeTruthy();
  });

  it('shows an empty state when there are no pending routes', async () => {
    setup({ routes: [], changeRequests: [] });

    await waitFor(() => expect(screen.getByText(/no custom routes are pending/i)).toBeTruthy());
  });

  it('opens the preview modal, validates the name field, and calls nameCustomRoute on submit', async () => {
    const nameMut = makeMutation();
    setup({ routes: [RECORDED_ROUTE], nameMut });

    await waitFor(() => expect(screen.getByText('CUST-ABC123-1')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /review & name/i }));

    const dialog = within(screen.getByRole('dialog'));
    const nameField = dialog.getByTestId('route-name-input');
    const activateButton = dialog.getByRole('button', { name: /name & activate/i });

    // Empty name — the activate button stays disabled
    expect(activateButton).toBeDisabled();

    fireEvent.change(nameField, { target: { value: 'Morning School Run' } });
    expect(activateButton).not.toBeDisabled();

    fireEvent.click(activateButton);

    await waitFor(() =>
      expect(nameMut.mutateAsync).toHaveBeenCalledWith({
        routeId: 'CUST-ABC123-1',
        payload: { routeName: 'Morning School Run' },
      })
    );
  });
});

describe('ManagerRouteApprovalsPage — route change requests', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lists pending route change requests', async () => {
    setup({ changeRequests: [CHANGE_REQUEST] });

    await waitFor(() => expect(screen.getByText('Morning School Run')).toBeTruthy());
    expect(screen.getByText(/220 m/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /review diff/i })).toBeTruthy();
  });

  it('opens the comparison panel showing both routes and deviation stats', async () => {
    setup({ changeRequests: [CHANGE_REQUEST] });

    await waitFor(() => expect(screen.getByText('Morning School Run')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /review diff/i }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByTestId('current-route-map')).toBeTruthy();
    expect(dialog.getByTestId('candidate-route-map')).toBeTruthy();
    expect(dialog.getByText(/50% of points off-route/)).toBeTruthy();
  });

  it('calls resolveRouteChangeRequest with ADOPT_NEW', async () => {
    const resolveMut = makeMutation();
    setup({ changeRequests: [CHANGE_REQUEST], resolveMut });

    await waitFor(() => expect(screen.getByText('Morning School Run')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /review diff/i }));

    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: /adopt new/i }));

    await waitFor(() =>
      expect(resolveMut.mutateAsync).toHaveBeenCalledWith({
        id: 'crq-1',
        payload: { resolution: 'ADOPT_NEW' },
      })
    );
  });

  it('calls resolveRouteChangeRequest with KEEP_OLD', async () => {
    const resolveMut = makeMutation();
    setup({ changeRequests: [CHANGE_REQUEST], resolveMut });

    await waitFor(() => expect(screen.getByText('Morning School Run')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /review diff/i }));

    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: /keep current/i }));

    await waitFor(() =>
      expect(resolveMut.mutateAsync).toHaveBeenCalledWith({
        id: 'crq-1',
        payload: { resolution: 'KEEP_OLD' },
      })
    );
  });
});
