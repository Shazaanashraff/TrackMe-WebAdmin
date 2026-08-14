import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ManagerTrackingPage } from '@/pages/ManagerTrackingPage';
import { useManagerFleetTracking } from '@/hooks/use-tracking';
import { getGoogleMapsApiKey } from '@/lib/googleMaps';
import { TooltipProvider } from '@/components/ui/tooltip';

const googleMapsMock = vi.hoisted(() => {
  const markerInstances = [];
  const map = {
    panTo: vi.fn(),
    setZoom: vi.fn(),
    fitBounds: vi.fn(),
    setCenter: vi.fn(),
  };
  class Marker {
    constructor(options) {
      this.options = options;
      this.addListener = vi.fn(() => ({ remove: vi.fn() }));
      this.setMap = vi.fn();
      markerInstances.push(this);
    }
  }
  class LatLngBounds {
    constructor() {
      this.extend = vi.fn();
    }
  }
  return { markerInstances, map, Marker, LatLngBounds };
});

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }) => <div data-testid="google-api-provider">{children}</div>,
  Map: ({ children }) => <div data-testid="fleet-map">{children}</div>,
  useMap: () => googleMapsMock.map,
  useMapsLibrary: () => ({
    Marker: googleMapsMock.Marker,
    LatLngBounds: googleMapsMock.LatLngBounds,
    SymbolPath: { CIRCLE: 'circle' },
  }),
}));

vi.mock('@/lib/googleMaps', () => ({ getGoogleMapsApiKey: vi.fn() }));

vi.mock('@/hooks/use-tracking', async () => {
  const actual = await vi.importActual('@/hooks/use-tracking');
  return { ...actual, useManagerFleetTracking: vi.fn() };
});

const now = () => new Date().toISOString();
const FLEET = [
  {
    vehicleId: 'VH-001',
    live: true,
    location: { lat: 7.2906, lng: 80.6337, speed: 10, heading: 90, receivedAt: now() },
    vehicle: { vehicleId: 'VH-001', vehicleName: 'Shuttle One', numberPlate: 'CAA-1001', routeId: 'RT-1' },
    driver: { _id: 'd1', name: 'Kamal Perera' },
  },
  {
    vehicleId: 'VH-002',
    live: false,
    location: null,
    vehicle: { vehicleId: 'VH-002', vehicleName: 'Express Two', numberPlate: 'CAA-1002', routeId: '' },
    driver: null,
  },
];

function mockTracking(overrides = {}) {
  useManagerFleetTracking.mockReturnValue({
    fleet: FLEET,
    connected: true,
    socketError: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  });
}

function renderPage() {
  return render(
    <TooltipProvider>
      <ManagerTrackingPage />
    </TooltipProvider>,
  );
}

describe('ManagerTrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    googleMapsMock.markerInstances.length = 0;
    getGoogleMapsApiKey.mockReturnValue('test-google-maps-key');
    mockTracking();
  });

  it('renders the fleet map, live count and selected vehicle telemetry', async () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Live tracking' })).toBeInTheDocument();
    expect(screen.getByText('1 of 2 fleet vehicles broadcasting now.')).toBeInTheDocument();
    expect(screen.getByTestId('fleet-map')).toBeInTheDocument();
    await waitFor(() => expect(googleMapsMock.markerInstances.length).toBeGreaterThan(0));
    expect(googleMapsMock.markerInstances.at(-1).options.position).toEqual({ lat: 7.2906, lng: 80.6337 });
    await waitFor(() => expect(screen.getByText('36 km/h')).toBeInTheDocument());
    expect(screen.getByText('90° E')).toBeInTheDocument();
    expect(screen.getAllByText('Kamal Perera')).toHaveLength(2);
  });

  it('shows configuration guidance when the Google Maps key is missing', () => {
    getGoogleMapsApiKey.mockReturnValue('');
    renderPage();

    expect(screen.getByTestId('google-map-unavailable')).toHaveTextContent('VITE_GOOGLE_MAPS_KEY');
    expect(screen.queryByTestId('fleet-map')).not.toBeInTheDocument();
  });

  it('selects a different vehicle from the fleet list', async () => {
    renderPage();
    const vehicleButton = await screen.findByRole('button', { name: /Express Two/ });

    fireEvent.click(vehicleButton);

    await waitFor(() => {
      expect(useManagerFleetTracking).toHaveBeenLastCalledWith('VH-002');
    });
    expect(screen.getByText('No driver assigned')).toBeInTheDocument();
  });

  it('shows the waiting-for-GPS state when a driver is live before the first fix', async () => {
    mockTracking({ fleet: [{ ...FLEET[0], location: null }] });
    renderPage();

    expect(await screen.findByText(/waiting for the first GPS fix/i)).toBeInTheDocument();
  });

  // Mounting <Map> bills a Google "Dynamic Maps" load, so a fleet with nothing
  // to plot must not instantiate one just to show an empty basemap.
  it('does not mount a map when no vehicle has a position to plot', () => {
    mockTracking({ fleet: [{ ...FLEET[1] }] });
    renderPage();

    expect(screen.getByTestId('fleet-map-idle')).toBeInTheDocument();
    expect(screen.queryByTestId('fleet-map')).not.toBeInTheDocument();
    expect(screen.queryByTestId('google-api-provider')).not.toBeInTheDocument();
  });

  it('mounts the map as soon as one vehicle has a position', async () => {
    renderPage();

    expect(await screen.findByTestId('fleet-map')).toBeInTheDocument();
    expect(screen.queryByTestId('fleet-map-idle')).not.toBeInTheDocument();
  });

  it('shows the polling fallback warning when the socket is disconnected', () => {
    mockTracking({
      connected: false,
      socketError: 'Live stream disconnected. Fleet positions will keep refreshing automatically.',
    });
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(/keep refreshing automatically/i);
  });

  it('renders loading, error and empty states honestly', () => {
    mockTracking({ fleet: [], isLoading: true });
    const { rerender } = renderPage();
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);

    mockTracking({ fleet: [], isLoading: false, error: new Error('Fleet failed') });
    rerender(<TooltipProvider><ManagerTrackingPage /></TooltipProvider>);
    expect(screen.getByText('Fleet failed')).toBeInTheDocument();

    mockTracking({ fleet: [], isLoading: false, error: null });
    rerender(<TooltipProvider><ManagerTrackingPage /></TooltipProvider>);
    expect(screen.getByText('No vehicles in your fleet')).toBeInTheDocument();
  });
});
