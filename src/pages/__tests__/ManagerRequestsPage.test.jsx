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
    organization: { _id: 'org-1', name: 'Ananda College', serviceType: 'SCHOOL' },
    passenger: {
      _id: 'u1',
      name: 'Nimal Fernando',
      email: 'nimal@t.com',
      contactPhone: '0771111111',
      organizationValues: { grade: '4' },
      organizationDetails: [{ key: 'grade', label: 'Grade', value: '4' }],
    },
    driver: { _id: 'd1', name: 'Kamal Perera', driverCode: 'DRV-4K7P-9XQ2' },
  },
  {
    _id: 'req-2',
    status: 'PENDING',
    requestedAt: '2026-08-07T10:00:00.000Z',
    organization: { _id: 'org-1', name: 'Ananda College', serviceType: 'SCHOOL' },
    passenger: { _id: 'u2', name: 'Sithara Jay', email: '' },
    driver: { _id: 'd1', name: 'Kamal Perera', driverCode: 'DRV-4K7P-9XQ2' },
  },
];

// A managed profile (a child, an employee the account holder added) has no
// email or phone of its own — the manager still needs to know whose account it
// is, and someone to call about the request.
const MANAGED_REQUEST = {
  _id: 'req-3',
  status: 'PENDING',
  requestedAt: '2026-08-07T11:00:00.000Z',
  organization: { _id: 'org-1', name: 'Ananda College', serviceType: 'SCHOOL' },
  passenger: {
    _id: 'u3',
    name: 'Amaya Perera',
    riderCode: 'TMR-KH6L-Y9TP',
    email: '',
    relation: 'Daughter',
    isManagedProfile: true,
    organizationDetails: [{ key: 'grade', label: 'Grade', value: '4' }],
    account: { name: 'Shazaan Ashraff', email: 'shazaan@t.com', phoneNumber: '0771234567' },
  },
  driver: { _id: 'd1', name: 'Kamal Perera', driverCode: 'DRV-4K7P-9XQ2' },
};

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
    expect(screen.getByText('Sithara Jay')).toBeInTheDocument();
    expect(screen.getAllByText('Kamal Perera')).toHaveLength(2);
  });

  // A manager decides on a phone call, not an email, and the address only made
  // the row wider.
  it('shows a contact phone rather than an email address', () => {
    setup();
    expect(screen.getByText('0771111111')).toBeInTheDocument();
    expect(screen.queryByText('nimal@t.com')).not.toBeInTheDocument();
  });

  it('names the organization the answers belong to, with each field labelled', () => {
    setup();
    expect(screen.getAllByText('Ananda College')).toHaveLength(2);
    expect(screen.getByText(/Grade:/)).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    // The raw field key never reaches the manager.
    expect(screen.queryByText(/grade:/)).not.toBeInTheDocument();
  });

  it('falls back to the raw answers when a payload carries no labelled details', () => {
    setup({
      requests: [{
        ...REQUESTS[0],
        passenger: { ...REQUESTS[0].passenger, organizationDetails: undefined },
      }],
    });
    expect(screen.getByText(/grade:/)).toBeInTheDocument();
  });

  // Cells that are two lines and cells that are one used to centre
  // independently, so the row read as a zig-zag instead of a line.
  it('starts every data cell on the same line', () => {
    setup({ requests: [REQUESTS[0]] });
    const cells = screen.getAllByRole('cell');
    cells.slice(0, -1).forEach((cell) => expect(cell).toHaveClass('align-top'));
    // The decision buttons stay centred against the whole row.
    expect(cells[cells.length - 1]).toHaveClass('align-middle');
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

  describe('a managed profile passenger', () => {
    it('identifies the rider profile by name and rider code', () => {
      setup({ requests: [MANAGED_REQUEST] });
      expect(screen.getByText('Amaya Perera')).toBeInTheDocument();
      expect(screen.getByText('TMR-KH6L-Y9TP')).toBeInTheDocument();
    });

    it('falls back to the owning account\'s phone in the Contact column', () => {
      setup({ requests: [MANAGED_REQUEST] });
      expect(screen.getByText('0771234567')).toBeInTheDocument();
      expect(screen.queryByText('shazaan@t.com')).not.toBeInTheDocument();
    });

    it('names the account holder in the confirm dialog, not just the profile', async () => {
      const user = userEvent.setup();
      setup({ requests: [MANAGED_REQUEST] });

      await user.click(screen.getByRole('button', { name: /approve/i }));
      expect(screen.getByText(/Approve Amaya Perera \(account: shazaan@t\.com\)\?/)).toBeInTheDocument();
    });
  });
});
