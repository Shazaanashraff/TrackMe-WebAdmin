import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ManagerRequestsPage } from '../ManagerRequestsPage';

vi.mock('@/hooks/use-enrollment-requests', () => ({
  useEnrollmentRequests: vi.fn(),
  useApproveEnrollmentRequest: vi.fn(),
  useRejectEnrollmentRequest: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: vi.fn() }));

import {
  useEnrollmentRequests,
  useApproveEnrollmentRequest,
  useRejectEnrollmentRequest,
} from '@/hooks/use-enrollment-requests';

const REQUESTS = [
  {
    _id: 'req-1',
    status: 'PENDING',
    requestedAt: '2026-08-07T09:00:00.000Z',
    passenger: { _id: 'u1', name: 'Nimal Fernando', email: 'nimal@t.com' },
    driver: { _id: 'd1', name: 'Kamal Perera', driverCode: 'DRV-4K7P-9XQ2' },
  },
  {
    _id: 'req-2',
    status: 'PENDING',
    requestedAt: '2026-08-07T10:00:00.000Z',
    passenger: { _id: 'u2', name: 'Sithara Jay', email: '' },
    driver: { _id: 'd1', name: 'Kamal Perera', driverCode: 'DRV-4K7P-9XQ2' },
  },
];

function makeMutation(overrides = {}) {
  return { mutate: vi.fn(), isPending: false, ...overrides };
}

function setup({ requests = REQUESTS, approveMut, rejectMut, isLoading = false } = {}) {
  useEnrollmentRequests.mockReturnValue({
    data: { data: requests }, isLoading, error: null, refetch: vi.fn(),
  });
  const approve = approveMut || makeMutation();
  const reject = rejectMut || makeMutation();
  useApproveEnrollmentRequest.mockReturnValue(approve);
  useRejectEnrollmentRequest.mockReturnValue(reject);

  render(
    <MemoryRouter>
      <ManagerRequestsPage />
    </MemoryRouter>
  );
  return { approve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ManagerRequestsPage', () => {
  it('lists each pending request with its passenger and driver', () => {
    setup();
    expect(screen.getByText('Nimal Fernando')).toBeInTheDocument();
    expect(screen.getByText('nimal@t.com')).toBeInTheDocument();
    expect(screen.getByText('Sithara Jay')).toBeInTheDocument();
    expect(screen.getAllByText('Kamal Perera')).toHaveLength(2);
  });

  it('tells the manager what the queue is for when it is empty', () => {
    setup({ requests: [] });
    expect(screen.getByText('No pending requests')).toBeInTheDocument();
  });

  it('approves only after the decision is confirmed', async () => {
    const user = userEvent.setup();
    const { approve } = setup();

    await user.click(screen.getAllByRole('button', { name: /approve/i })[0]);
    // The dialog is a second chance, so nothing should have fired yet.
    expect(approve.mutate).not.toHaveBeenCalled();

    expect(screen.getByText(/Approve Nimal Fernando\?/)).toBeInTheDocument();

    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^approve$/i }));
    expect(approve.mutate).toHaveBeenCalledWith('req-1', expect.anything());
  });

  it('declines through the same confirmation, worded as a decline', async () => {
    const user = userEvent.setup();
    const { reject } = setup();

    await user.click(screen.getAllByRole('button', { name: /decline/i })[0]);
    expect(screen.getByText(/Decline Nimal Fernando\?/)).toBeInTheDocument();
    expect(screen.getByText(/can ask again later/i)).toBeInTheDocument();

    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^decline$/i }));
    expect(reject.mutate).toHaveBeenCalledWith('req-1', expect.anything());
  });

  it('disables the row actions while a decision is in flight', () => {
    setup({ approveMut: makeMutation({ isPending: true }) });
    screen.getAllByRole('button', { name: /approve/i }).forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
