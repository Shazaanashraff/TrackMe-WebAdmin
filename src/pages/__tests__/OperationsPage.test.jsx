import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { OperationsPage } from '../OperationsPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    getOperationsOverview: vi.fn(() =>
      Promise.resolve({ data: [{ managerId: 'mgr-1', managerName: 'Manager One', managerEmail: 'm1@x.com', isActive: true }] })
    ),
    getOperationManagerDetail: vi.fn(() =>
      Promise.resolve({
        data: {
          manager: { name: 'Manager One', email: 'm1@x.com' },
          buses: [{
            _id: 'bus-1',
            busName: 'Shuttle 1',
            routeId: 'PUB-1',
            serviceType: 'PUBLIC',
            bookingEnabled: true,
            isActive: true,
            reviewMetrics: { averageRating: 4, reviewCount: 2 },
            bookingMetrics: { totalBookings: 5, totalRevenue: 1000 }
          }]
        }
      })
    ),
    getPendingBusRequests: vi.fn(() => Promise.resolve({ data: [] })),
    getAuditLogs: vi.fn(() => Promise.resolve({ data: [] })),
    updateBus: vi.fn(() => Promise.resolve({ success: true })),
  }
}));

describe('OperationsPage booking-enabled removal', () => {
  it('renders no booking-enabled chip or booking status toggle', async () => {
    render(<OperationsPage />);
    await waitFor(() => expect(adminApi.getOperationManagerDetail).toHaveBeenCalled());
    await screen.findByText('Shuttle 1');

    expect(screen.queryByText('Enabled')).toBeNull();
    expect(screen.queryByText('Disabled')).toBeNull();

    fireEvent.click(screen.getByTitle(/edit bus settings/i));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.queryByText(/booking status/i)).toBeNull();
  });
});
