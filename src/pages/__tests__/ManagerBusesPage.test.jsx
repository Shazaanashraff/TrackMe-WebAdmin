import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { ManagerBusesPage } from '../ManagerBusesPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    getManagerBuses: vi.fn(() => Promise.resolve({ data: [] })),
    getManagerAssignableRoutes: vi.fn(() =>
      Promise.resolve({ data: [{ routeId: 'PUB-1', routeName: 'Public Route', visibility: 'PUBLIC' }] })
    ),
    createBusAccountRequest: vi.fn(() => Promise.resolve({ success: true, data: { _id: 'req-1' } })),
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const openCreateDialogAndFillStep0 = async ({ routeMode } = {}) => {
  fireEvent.click(screen.getByRole('button', { name: /add bus request/i }));

  const dialog = screen.getByRole('dialog');
  const within_ = within(dialog);

  fireEvent.change(within_.getByLabelText(/bus id/i), { target: { value: 'BUS-99' } });
  fireEvent.change(within_.getByLabelText(/bus name/i), { target: { value: 'Shuttle 99' } });
  fireEvent.change(within_.getByLabelText(/number plate/i), { target: { value: 'ABC-123' } });

  if (routeMode === 'CUSTOM') {
    fireEvent.click(within_.getByRole('button', { name: /custom route \(driver records\)/i }));
  } else {
    fireEvent.mouseDown(within_.getByRole('combobox', { name: /^route$/i }));
    fireEvent.click(await screen.findByText(/Public Route \(PUB-1\)/i));
  }

  fireEvent.change(within_.getByLabelText(/seat capacity/i), { target: { value: '30' } });
  fireEvent.click(within_.getByRole('button', { name: /continue/i }));
};

describe('ManagerBusesPage route assignment toggle', () => {
  it('submits routeMode CUSTOM and no routeId when the Custom Route option is chosen', async () => {
    render(<ManagerBusesPage />);
    await waitFor(() => expect(adminApi.getManagerAssignableRoutes).toHaveBeenCalled());

    await openCreateDialogAndFillStep0({ routeMode: 'CUSTOM' });

    // Step 1 (Driver & Access) — password required before submit.
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText(/initial password/i), { target: { value: 'Sup3rSecret!' } });
    fireEvent.click(dialog.getByRole('button', { name: /continue/i }));

    fireEvent.click(dialog.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(adminApi.createBusAccountRequest).toHaveBeenCalledTimes(1));
    const payload = adminApi.createBusAccountRequest.mock.calls[0][0];
    expect(payload.routeMode).toBe('CUSTOM');
    expect(payload.routeId).toBe('');
  });

  it('does not require a routeId to advance past step 0 in Custom mode', async () => {
    render(<ManagerBusesPage />);
    await waitFor(() => expect(adminApi.getManagerAssignableRoutes).toHaveBeenCalled());

    await openCreateDialogAndFillStep0({ routeMode: 'CUSTOM' });

    // If we reach step 1, the driver/password fields are visible.
    expect(screen.getByLabelText(/initial password/i)).toBeTruthy();
  });

  it('submits routeMode EXISTING with the selected routeId by default', async () => {
    render(<ManagerBusesPage />);
    await waitFor(() => expect(adminApi.getManagerAssignableRoutes).toHaveBeenCalled());

    await openCreateDialogAndFillStep0({ routeMode: 'EXISTING' });
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText(/initial password/i), { target: { value: 'Sup3rSecret!' } });
    fireEvent.click(dialog.getByRole('button', { name: /continue/i }));
    fireEvent.click(dialog.getByRole('button', { name: /submit request/i }));

    await waitFor(() => expect(adminApi.createBusAccountRequest).toHaveBeenCalledTimes(1));
    const payload = adminApi.createBusAccountRequest.mock.calls[0][0];
    expect(payload.routeMode).toBe('EXISTING');
    expect(payload.routeId).toBe('PUB-1');
  });
});

describe('ManagerBusesPage booking-enabled removal', () => {
  it('renders no booking-enabled controls in the grid, summary, or edit dialog', async () => {
    adminApi.getManagerBuses.mockResolvedValue({
      data: [{
        _id: 'bus-1',
        busId: 'BUS-1',
        busName: 'Shuttle 1',
        numberPlate: 'AB-1234',
        routeId: 'PUB-1',
        serviceType: 'PUBLIC',
        seatCapacity: 40,
        busType: 'AC',
        bookingEnabled: true,
        isActive: true
      }]
    });

    render(<ManagerBusesPage />);
    await screen.findByText('Shuttle 1');

    expect(screen.queryByText(/booking enabled/i)).toBeNull();
    expect(screen.queryByRole('columnheader', { name: /booking/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.queryByLabelText(/^booking$/i)).toBeNull();
  });
});
