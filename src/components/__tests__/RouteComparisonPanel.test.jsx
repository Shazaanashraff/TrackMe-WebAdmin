import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Polyline: () => null,
  Marker: () => null,
}));

vi.mock('leaflet', () => ({
  default: { Icon: class Icon {} },
  Icon: class Icon {},
}));

import { RouteComparisonPanel } from '../RouteComparisonPanel';

const CHANGE_REQUEST = {
  _id: 'crq-1',
  currentRouteId: {
    routeId: 'RT-1',
    routeName: 'Morning School Run',
    pathPolyline: '_p~iF~ps|U_ulLnnqC',
    stops: [],
    distance: 4.2,
  },
  candidate: {
    pathPolyline: '_ulLnnqC_mqNvxq`@',
    stops: [],
    distance: 4.6,
    snapped: true,
  },
  deviation: { maxMeters: 220, fractionOff: 0.5, sampleCount: 10 },
};

function setup(props = {}) {
  const defaults = {
    open: true,
    changeRequest: CHANGE_REQUEST,
    resolving: false,
    error: '',
    onClose: vi.fn(),
    onResolve: vi.fn(),
  };
  render(<RouteComparisonPanel {...defaults} {...props} />);
  return defaults;
}

describe('RouteComparisonPanel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the dialog title', () => {
    setup();
    expect(within(screen.getByRole('dialog')).getByText('Review Route Change')).toBeTruthy();
  });

  it('shows deviation stats', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/220 m/)).toBeTruthy();
    expect(within(dialog).getByText(/50% of points off-route/)).toBeTruthy();
    expect(within(dialog).getByText(/10 GPS samples/)).toBeTruthy();
  });

  it('renders both map containers with correct testids', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByTestId('current-route-map')).toBeTruthy();
    expect(within(dialog).getByTestId('candidate-route-map')).toBeTruthy();
  });

  it('shows route distances', () => {
    setup();
    expect(document.body.textContent).toMatch(/4\.2 km/);
    expect(document.body.textContent).toMatch(/4\.6 km/);
  });

  it('calls onResolve with ADOPT_NEW when Adopt New is clicked', async () => {
    const onResolve = vi.fn();
    setup({ onResolve });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /adopt new/i }));
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith('ADOPT_NEW'));
  });

  it('calls onResolve with KEEP_OLD when Keep Current is clicked', async () => {
    const onResolve = vi.fn();
    setup({ onResolve });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /keep current/i }));
    await waitFor(() => expect(onResolve).toHaveBeenCalledWith('KEEP_OLD'));
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    setup({ onClose });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the error alert when error prop is set', () => {
    setup({ error: 'Failed to resolve' });
    expect(within(screen.getByRole('dialog')).getByText('Failed to resolve')).toBeTruthy();
  });

  it('disables action buttons while resolving', () => {
    setup({ resolving: true });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: /keep current/i })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
