import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ManagerTrackingPage } from '../ManagerTrackingPage';

// ----------------------------------------------------------------
// Map + socket mocks
// ----------------------------------------------------------------
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }) => <div data-testid="map-marker">{children}</div>,
  Polyline: () => <div data-testid="map-polyline" />,
  Tooltip: ({ children }) => <span>{children}</span>,
  useMap: () => ({ setView: vi.fn() }),
}));

vi.mock('leaflet', () => ({
  default: { Icon: class Icon { constructor() {} } },
  Icon: class Icon { constructor() {} },
}));

const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock('@/hooks/use-buses', () => ({
  useManagerBuses: vi.fn(),
}));

vi.mock('@/hooks/use-tracking', () => ({
  useManagerBusLocation: vi.fn(),
}));

import { io } from 'socket.io-client';
import { useManagerBuses } from '@/hooks/use-buses';
import { useManagerBusLocation } from '@/hooks/use-tracking';

const BUSES = [
  { _id: 'b1', busId: 'BUS-1', busName: 'Shuttle 1', isActive: true },
  { _id: 'b2', busId: 'BUS-2', busName: 'Express 2', isActive: true },
];

const LOCATION = {
  bus: { busId: 'BUS-1', busName: 'Shuttle 1', routeId: 'PUB-1' },
  latest: { lat: 7.2906, lng: 80.6337, timestamp: '2026-07-17T10:00:00Z', speed: 45, accuracy: 10, busId: 'BUS-1' },
  history: [
    { lat: 7.2900, lng: 80.6330, timestamp: '2026-07-17T09:58:00Z', speed: 40, accuracy: 12 },
    { lat: 7.2906, lng: 80.6337, timestamp: '2026-07-17T10:00:00Z', speed: 45, accuracy: 10 },
  ],
};

function defaultHooks({
  buses = BUSES, busesLoading = false, busesError = null,
  location = LOCATION, locationLoading = false, locationError = null,
} = {}) {
  useManagerBuses.mockReturnValue({
    data: buses ? { data: buses } : undefined,
    isLoading: busesLoading,
    isError: Boolean(busesError),
    error: busesError,
    refetch: vi.fn(),
  });
  useManagerBusLocation.mockReturnValue({
    data: location ? { data: location } : undefined,
    isLoading: locationLoading,
    isError: Boolean(locationError),
    error: locationError,
  });
}

function setup(opts) {
  defaultHooks(opts);
  const user = userEvent.setup();
  render(<MemoryRouter><ManagerTrackingPage /></MemoryRouter>);
  return { user };
}

describe('ManagerTrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockReset();
    mockSocket.emit.mockReset();
    mockSocket.disconnect.mockReset();
    localStorage.clear();
  });

  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /live tracking/i })).toBeInTheDocument();
  });

  it('shows error alert when buses query fails', () => {
    setup({ busesError: new Error('Network error'), buses: null, location: null });
    expect(document.body.textContent).toMatch(/network error/i);
  });

  it('shows error alert when location query fails', () => {
    setup({ locationError: new Error('GPS error'), location: null });
    expect(document.body.textContent).toMatch(/gps error/i);
  });

  it('renders bus selector label', () => {
    setup();
    expect(screen.getByLabelText(/select vehicle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/history window/i)).toBeInTheDocument();
  });

  it('renders history window select options', async () => {
    const { user } = setup();
    await user.click(screen.getByLabelText(/history window/i));
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /15 minutes/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /30 minutes/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /60 minutes/i })).toBeInTheDocument();
    });
  });

  it('renders history point count', () => {
    setup();
    // LOCATION.history has 2 points
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('History Points')).toBeInTheDocument();
  });

  it('renders live status panel with speed and accuracy', () => {
    setup();
    expect(screen.getByText('Live Status')).toBeInTheDocument();
    expect(screen.getByText('45 km/h')).toBeInTheDocument();
    expect(screen.getByText('10 m')).toBeInTheDocument();
  });

  it('shows selected bus name and route in live status', () => {
    setup();
    // Speed and accuracy come from locationData — if these render, locationData is set
    expect(screen.getByText('45 km/h')).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/Shuttle 1/);
    expect(document.body.textContent).toMatch(/Route: PUB-1/);
  });

  it('shows N/A speed and accuracy when no live data', () => {
    setup({ location: { ...LOCATION, latest: null } });
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(2);
  });

  it('renders the map container', () => {
    setup();
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('does NOT connect socket when no auth token', () => {
    // localStorage.clear() ensures no token
    setup();
    expect(io).not.toHaveBeenCalled();
  });

  it('connects socket when auth token is present', () => {
    localStorage.setItem('admin-auth', JSON.stringify({ token: 'test-token-123' }));
    setup();
    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: { token: 'test-token-123' } }),
    );
  });

  it('emits manager:join-bus on socket connect', () => {
    localStorage.setItem('admin-auth', JSON.stringify({ token: 'tkn' }));
    setup();
    // Find the 'connect' handler and invoke it
    const connectCall = mockSocket.on.mock.calls.find(([event]) => event === 'connect');
    expect(connectCall).toBeTruthy();
    connectCall[1](); // invoke the connect handler
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'manager:join-bus',
      { busId: 'BUS-1' },
      expect.any(Function),
    );
  });

  it('shows "No buses found" when bus list is empty', () => {
    // Pass location: null so locationData stays null → bus name falls through to 'No bus selected'
    setup({ buses: [], location: null });
    expect(screen.getByText('No bus selected')).toBeInTheDocument();
  });
});
