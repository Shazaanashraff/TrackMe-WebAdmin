import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RoutesPage } from '../RoutesPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    getSystemRoutes: vi.fn(() => Promise.resolve({
      data: [
        { _id: 'r1', routeId: 'RT-1', routeName: 'Downtown Loop', province: 'Western' }
      ]
    }))
  }
}));

describe('RoutesPage', () => {
  it('renders the create-route form and the province summary list after the Grid v7 migration', async () => {
    render(<RoutesPage refreshSignal={0} />);

    expect(screen.getByLabelText(/Route ID/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Route Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Source/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Destination/)).toBeInTheDocument();

    await waitFor(() => expect(adminApi.getSystemRoutes).toHaveBeenCalled());
    expect(screen.getByText('Western Province')).toBeInTheDocument();
    expect(screen.getByText(/routes by province manager/i)).toBeInTheDocument();
  });
});
