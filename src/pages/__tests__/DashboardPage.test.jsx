import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardPage } from '../DashboardPage';

vi.mock('../../api', () => ({
  adminApi: {
    getSuperAdminDashboard: vi.fn(() => Promise.resolve({
      data: {
        managers: { totalManagers: 4 },
        buses: { activeBuses: 10, inactiveBuses: 1 },
        bookings: { confirmedBookings: 25 },
        reviews: { averageRating: 4.2 }
      }
    })),
    getOperationsOverview: vi.fn(() => Promise.resolve({ data: [] })),
    getPendingBusRequests: vi.fn(() => Promise.resolve({ data: [] }))
  }
}));

describe('DashboardPage', () => {
  it('renders real KPI values without fabricated deltas or fake freshness timestamps', async () => {
    render(<DashboardPage refreshSignal={0} />);

    await waitFor(() => expect(screen.getByText('4', { selector: 'h5' })).toBeInTheDocument());
    expect(screen.getByText('10', { selector: 'h5' })).toBeInTheDocument();
    expect(screen.getByText('25', { selector: 'h5' })).toBeInTheDocument();

    expect(screen.queryByText(/\+18%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+24%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+15%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+12%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+5%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/updated 4 min ago/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/updated 2 hours ago/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/just updated/i)).not.toBeInTheDocument();
  });
});
