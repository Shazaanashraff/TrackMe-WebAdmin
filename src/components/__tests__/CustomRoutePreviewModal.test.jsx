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

import { CustomRoutePreviewModal } from '../CustomRoutePreviewModal';

const ROUTE = {
  routeId: 'CUST-1',
  distance: 4.2,
  stops: [{ lat: 6.9271, lng: 79.8612, stopName: 'Stop 1' }],
  pathPolyline: '_p~iF~ps|U_ulLnnqC',
  recordedMeta: { snapped: true },
};

function setup(props = {}) {
  const defaults = {
    open: true,
    route: ROUTE,
    saving: false,
    error: '',
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };
  render(<CustomRoutePreviewModal {...defaults} {...props} />);
  return defaults;
}

describe('CustomRoutePreviewModal', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the dialog title and route stats', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Review Recorded Route')).toBeTruthy();
    expect(within(dialog).getByText(/4\.2 km/)).toBeTruthy();
    expect(within(dialog).getByText(/1 stops/)).toBeTruthy();
    expect(within(dialog).getByText(/Snapped to roads/)).toBeTruthy();
  });

  it('shows Raw GPS path badge when route is not snapped', () => {
    setup({ route: { ...ROUTE, recordedMeta: { snapped: false } } });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Raw GPS path/)).toBeTruthy();
  });

  it('renders the map container', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByTestId('route-preview-map')).toBeTruthy();
  });

  it('disables the Name & Activate button when the name is empty', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    const btn = within(dialog).getByRole('button', { name: /name & activate/i });
    expect(btn).toBeDisabled();
  });

  it('enables the button after typing a name and calls onSubmit on click', async () => {
    const onSubmit = vi.fn();
    setup({ onSubmit });
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByTestId('route-name-input');
    fireEvent.change(input, { target: { value: 'Morning School Run' } });
    const btn = within(dialog).getByRole('button', { name: /name & activate/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Morning School Run'));
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    setup({ onClose });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the error alert when error prop is set', () => {
    setup({ error: 'Failed to save route' });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Failed to save route')).toBeTruthy();
  });

  it('disables both buttons while saving', () => {
    setup({ saving: true });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
