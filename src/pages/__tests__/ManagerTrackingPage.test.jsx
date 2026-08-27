import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

// Split by library exactly as the Maps JS API splits it. A single object for
// every library name would let the page ask for the wrong one and still pass
// here, which is how `SymbolPath` off the maps library reached the browser and
// crashed the page on its first plotted vehicle.
vi.mock('@vis.gl/react-google-maps', () => {
  const libraries = {
    core: {
      LatLngBounds: googleMapsMock.LatLngBounds,
      SymbolPath: { CIRCLE: 'circle' },
    },
    marker: { Marker: googleMapsMock.Marker },
    maps: { Map: class {} },
  };
  return {
    APIProvider: ({ children }) => <div data-testid="google-api-provider">{children}</div>,
    Map: ({ children }) => <div data-testid="fleet-map">{children}</div>,
    useMap: () => googleMapsMock.map,
    useMapsLibrary: (name) => libraries[name] ?? {},
  };
});

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

function page() {
  return (
    <TooltipProvider>
      <ManagerTrackingPage />
    </TooltipProvider>
  );
}

function renderPage(path = '/manager/tracking') {
  return render(<MemoryRouter initialEntries={[path]}>{page()}</MemoryRouter>);
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
    // Drawn from the marker and core libraries. Reading either name off the
    // maps library instead leaves it undefined and throws on the first plot.
    expect(googleMapsMock.markerInstances.at(-1).options.icon.path).toBe('circle');
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

  // An offline vehicle keeps its last known position forever, and plotting it
  // would bill a map load every time the page opens with nobody driving.
  it('does not mount a map for an offline vehicle holding a stale position', () => {
    mockTracking({
      fleet: [{
        ...FLEET[1],
        location: { lat: 6.93104, lng: 79.90562, receivedAt: new Date(Date.now() - 86_400_000).toISOString() },
      }],
    });
    renderPage();

    expect(screen.getByTestId('fleet-map-idle')).toBeInTheDocument();
    expect(screen.queryByTestId('fleet-map')).not.toBeInTheDocument();
    expect(screen.queryByTestId('google-api-provider')).not.toBeInTheDocument();
  });

  // A live driver who has gone quiet is still on a journey: the map stays up.
  it('keeps the map mounted for a stale but still-live vehicle', async () => {
    mockTracking({
      fleet: [{
        ...FLEET[0],
        location: { ...FLEET[0].location, receivedAt: new Date(Date.now() - 120_000).toISOString() },
      }],
    });
    renderPage();

    expect(await screen.findByTestId('fleet-map')).toBeInTheDocument();
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

    // A status-bearing error (a real response the server sent back, just with
    // a status ErrorState has no specific copy for) so this fixture represents
    // a genuine rejection rather than a network failure — the two now render
    // different text (issue #76), and this test isn't the one that locks in
    // that distinction (see error-state.test.jsx for that).
    const fleetError = new Error('Fleet failed');
    fleetError.status = 400;
    mockTracking({ fleet: [], isLoading: false, error: fleetError });
    rerender(<MemoryRouter>{page()}</MemoryRouter>);
    expect(screen.getByText('Fleet failed')).toBeInTheDocument();

    mockTracking({ fleet: [], isLoading: false, error: null });
    rerender(<MemoryRouter>{page()}</MemoryRouter>);
    expect(screen.getByText('No vehicles in your fleet')).toBeInTheDocument();
  });

  // The drivers directory links here with a vehicle already chosen, and that
  // choice has to survive the first render, where the fleet is still empty.
  it('follows the vehicle named in the URL instead of the first one plotted', async () => {
    mockTracking({ fleet: [], isLoading: true });
    const { rerender } = renderPage('/manager/tracking?vehicle=VH-002');
    expect(useManagerFleetTracking).toHaveBeenLastCalledWith('VH-002');

    mockTracking();
    rerender(<MemoryRouter initialEntries={['/manager/tracking?vehicle=VH-002']}>{page()}</MemoryRouter>);

    await waitFor(() => {
      expect(useManagerFleetTracking).toHaveBeenLastCalledWith('VH-002');
    });
    // The details panel is on VH-002, which has no driver, rather than on
    // VH-001, the only vehicle with a position to plot.
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  describe('offline (Offline & Caching Audit §7)', () => {
    function setOnline(value) {
      Object.defineProperty(navigator, 'onLine', { value, writable: true, configurable: true });
    }
    afterEach(() => setOnline(true));

    it('shows the "unavailable — offline" panel instead of the map or a red error, and plots nothing', () => {
      setOnline(false);
      // Offline the live query has errored and there is no persisted fleet.
      mockTracking({ fleet: [], error: Object.assign(new Error('Failed to fetch')) });
      renderPage();

      expect(screen.getByTestId('fleet-map-offline')).toBeInTheDocument();
      expect(screen.getByText(/live tracking unavailable/i)).toBeInTheDocument();
      expect(screen.queryByTestId('fleet-map')).toBeNull();
      expect(screen.queryByText('Failed to load')).toBeNull();
      expect(googleMapsMock.markerInstances.length).toBe(0);
    });

    it('names the fleet size when a snapshot is still in memory but stays map-less', () => {
      setOnline(false);
      mockTracking(); // FLEET has 2 vehicles
      renderPage();

      expect(screen.getByTestId('fleet-map-offline')).toBeInTheDocument();
      expect(screen.getByText(/fleet: 2 vehicles/i)).toBeInTheDocument();
      expect(screen.queryByTestId('fleet-map')).toBeNull();
    });
  });
});
