import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ManagerDashboardPage } from '../ManagerDashboardPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    getManagerDashboard: vi.fn(() =>
      Promise.resolve({
        data: {
          fleet: { totalBuses: 5, activeBuses: 4 },
          pendingRequests: 1,
          bookings: { confirmedBookings: 10, cancelledBookings: 2, totalRevenue: 12500 },
        },
      })
    ),
  },
}));

describe('ManagerDashboardPage currency', () => {
  it('renders revenue in LKR and never in ₹ or $', async () => {
    render(<ManagerDashboardPage />);
    await waitFor(() => expect(adminApi.getManagerDashboard).toHaveBeenCalled());

    const rsMatches = await screen.findAllByText(/Rs\./);
    expect(rsMatches.length).toBeGreaterThan(0);
    expect(screen.queryByText(/₹/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/\$\d/);
  });
});
