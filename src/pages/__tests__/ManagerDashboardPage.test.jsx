import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ManagerDashboardPage } from '../ManagerDashboardPage';

vi.mock('../../api', () => ({
  adminApi: {
    getManagerDashboard: vi.fn(() => Promise.resolve({
      data: {
        fleet: { totalBuses: 8, activeBuses: 6 },
        pendingRequests: 2,
        bookings: { confirmedBookings: 40, cancelledBookings: 3, totalRevenue: 12000 }
      }
    }))
  }
}));

describe('ManagerDashboardPage', () => {
  it('renders real KPI values without fabricated deltas or the fake "peaking" claim', async () => {
    render(<ManagerDashboardPage refreshSignal={0} />);

    await waitFor(() => expect(screen.getByText('8')).toBeInTheDocument());
    expect(screen.getByText('75%')).toBeInTheDocument();

    expect(screen.queryByText(/\+0%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+12%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/peaking/i)).not.toBeInTheDocument();
  });
});
