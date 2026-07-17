import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManagersPage } from '../ManagersPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    getManagers: vi.fn(() => Promise.resolve({
      data: [{ _id: 'm1', name: 'Ada Lovelace', email: 'ada@trackme.test', isActive: true }]
    })),
    updateManagerStatus: vi.fn(() => Promise.resolve({ success: true })),
    createManager: vi.fn(() => Promise.resolve({ success: true })),
    updateManager: vi.fn(() => Promise.resolve({ success: true })),
    resetManagerPassword: vi.fn(() => Promise.resolve({ success: true })),
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ManagersPage (MUI Button migration)', () => {
  it('renders the migrated MUI action buttons and still fires the toggle-status handler', async () => {
    render(<ManagersPage refreshSignal={0} />);

    await screen.findByText('Ada Lovelace');

    const editButton = screen.getByRole('button', { name: 'Edit' });
    const deactivateButton = screen.getByRole('button', { name: 'Deactivate' });
    expect(editButton).toBeInTheDocument();
    expect(deactivateButton).toBeInTheDocument();

    fireEvent.click(deactivateButton);
    await waitFor(() => expect(adminApi.updateManagerStatus).toHaveBeenCalledWith('m1', { isActive: false }));
  });

  it('opens the Add Manager dialog and submits via the migrated MUI buttons', async () => {
    render(<ManagersPage refreshSignal={0} />);

    await screen.findByText('Ada Lovelace');

    fireEvent.click(screen.getByRole('button', { name: 'Add Manager' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Enter full name'), { target: { value: 'Grace Hopper' } });
    fireEvent.change(screen.getByPlaceholderText('manager@company.com'), { target: { value: 'grace@trackme.test' } });
    fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), { target: { value: 'longenoughpw' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Manager' }));

    await waitFor(() => expect(adminApi.createManager).toHaveBeenCalledWith({
      name: 'Grace Hopper',
      email: 'grace@trackme.test',
      password: 'longenoughpw'
    }));
  });
});
