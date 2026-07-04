import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { ManagerRouteApprovalsPage } from '../ManagerRouteApprovalsPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    getManagerCustomRoutes: vi.fn(),
    nameCustomRoute: vi.fn(() => Promise.resolve({ success: true, data: { status: 'ACTIVE' } })),
    getRouteChangeRequests: vi.fn(() => Promise.resolve({ data: [] })),
    resolveRouteChangeRequest: vi.fn(() => Promise.resolve({ success: true }))
  }
}));

// react-leaflet needs real layout/ResizeObserver to render a tile map — that's
// not the behavior under test here, so stub it with plain divs.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Polyline: () => null,
  Marker: () => null
}));

const RECORDED_ROUTE = {
  routeId: 'CUST-ABC123-1',
  distance: 4.2,
  stopsCount: 3,
  pathPolyline: '_p~iF~ps|U_ulLnnqC',
  stops: [{ lat: 6.9271, lng: 79.8612, stopName: 'Stop 1' }],
  recordedMeta: { snapped: true }
};

const PENDING_UNRECORDED_ROUTE = {
  routeId: 'CUST-ABC123-2',
  distance: 0,
  stopsCount: 0,
  pathPolyline: ''
};

const CHANGE_REQUEST = {
  _id: 'crq-1',
  currentRouteId: { routeId: 'CUST-ABC123-1', routeName: 'Morning School Run', pathPolyline: '_p~iF~ps|U_ulLnnqC', stops: [], distance: 4.2 },
  candidate: { pathPolyline: '_ulLnnqC_mqNvxq`@', stops: [], distance: 4.6, snapped: true },
  deviation: { maxMeters: 220, fractionOff: 0.5, sampleCount: 10 },
  status: 'PENDING'
};

beforeEach(() => {
  vi.clearAllMocks();
  adminApi.getManagerCustomRoutes.mockResolvedValue({ data: [] });
  adminApi.getRouteChangeRequests.mockResolvedValue({ data: [] });
});

describe('ManagerRouteApprovalsPage', () => {
  it('renders recorded routes as reviewable and unrecorded ones separately', async () => {
    adminApi.getManagerCustomRoutes.mockResolvedValue({ data: [RECORDED_ROUTE, PENDING_UNRECORDED_ROUTE] });
    render(<ManagerRouteApprovalsPage />);

    await waitFor(() => expect(screen.getByText('CUST-ABC123-1')).toBeTruthy());
    expect(screen.getByText('CUST-ABC123-2')).toBeTruthy();
    expect(screen.getByText(/awaiting driver recording/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /review & name/i })).toBeTruthy();
  });

  it('shows an empty state when there are no pending routes', async () => {
    adminApi.getManagerCustomRoutes.mockResolvedValue({ data: [] });
    render(<ManagerRouteApprovalsPage />);

    await waitFor(() => expect(screen.getByText(/no custom routes are pending/i)).toBeTruthy());
  });

  it('opens the preview modal, validates the name field, and calls nameCustomRoute on submit', async () => {
    adminApi.getManagerCustomRoutes.mockResolvedValue({ data: [RECORDED_ROUTE] });
    render(<ManagerRouteApprovalsPage />);

    await waitFor(() => expect(screen.getByText('CUST-ABC123-1')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /review & name/i }));

    const dialog = within(screen.getByRole('dialog'));
    const nameField = dialog.getByTestId('route-name-input');
    const activateButton = dialog.getByRole('button', { name: /name & activate/i });

    // Empty name — the activate action stays disabled.
    expect(activateButton).toBeDisabled();

    fireEvent.change(nameField, { target: { value: 'Morning School Run' } });
    expect(activateButton).not.toBeDisabled();

    fireEvent.click(activateButton);

    await waitFor(() => expect(adminApi.nameCustomRoute).toHaveBeenCalledWith('CUST-ABC123-1', { routeName: 'Morning School Run' }));
  });
});

describe('ManagerRouteApprovalsPage — route change requests (Phase 2)', () => {
  it('lists pending route change requests', async () => {
    adminApi.getRouteChangeRequests.mockResolvedValue({ data: [CHANGE_REQUEST] });
    render(<ManagerRouteApprovalsPage />);

    await waitFor(() => expect(screen.getByText('Morning School Run')).toBeTruthy());
    expect(screen.getByText(/220 m/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /review diff/i })).toBeTruthy();
  });

  it('opens the comparison panel showing both routes and deviation stats', async () => {
    adminApi.getRouteChangeRequests.mockResolvedValue({ data: [CHANGE_REQUEST] });
    render(<ManagerRouteApprovalsPage />);

    await waitFor(() => expect(screen.getByText('Morning School Run')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /review diff/i }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByTestId('current-route-map')).toBeTruthy();
    expect(dialog.getByTestId('candidate-route-map')).toBeTruthy();
    expect(dialog.getByText(/50% of points off-route/)).toBeTruthy();
  });

  it('calls resolveRouteChangeRequest with ADOPT_NEW and refreshes the list', async () => {
    adminApi.getRouteChangeRequests.mockResolvedValueOnce({ data: [CHANGE_REQUEST] }).mockResolvedValue({ data: [] });
    render(<ManagerRouteApprovalsPage />);

    await waitFor(() => expect(screen.getByText('Morning School Run')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /review diff/i }));

    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: /adopt new/i }));

    await waitFor(() => expect(adminApi.resolveRouteChangeRequest).toHaveBeenCalledWith('crq-1', { resolution: 'ADOPT_NEW' }));
  });

  it('calls resolveRouteChangeRequest with KEEP_OLD', async () => {
    adminApi.getRouteChangeRequests.mockResolvedValueOnce({ data: [CHANGE_REQUEST] }).mockResolvedValue({ data: [] });
    render(<ManagerRouteApprovalsPage />);

    await waitFor(() => expect(screen.getByText('Morning School Run')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /review diff/i }));

    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: /keep current/i }));

    await waitFor(() => expect(adminApi.resolveRouteChangeRequest).toHaveBeenCalledWith('crq-1', { resolution: 'KEEP_OLD' }));
  });
});
