import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { ManagerPrivateRoutesPage } from '../ManagerPrivateRoutesPage';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    getManagerOwnedRoutes: vi.fn(),
    updateRoutePrivacy: vi.fn(),
    rotateRoomKey: vi.fn(),
    revealRoomKey: vi.fn(),
    getRouteJoinRequests: vi.fn(),
    decideJoinRequest: vi.fn(),
    getRouteMembers: vi.fn(),
    revokeRouteMember: vi.fn()
  }
}));

const PUBLIC_ROUTE = {
  routeId: 'RT-1',
  routeName: 'Downtown Loop',
  source: 'A',
  destination: 'B',
  visibility: 'PUBLIC',
  isHidden: false,
  joinApprovalRequired: false,
  isActive: true,
  status: 'ACTIVE',
  hasRoomKey: false,
  memberCount: 0,
  pendingRequestCount: 0
};

const PRIVATE_ROUTE = {
  routeId: 'RT-2',
  routeName: 'School Express',
  source: 'C',
  destination: 'D',
  visibility: 'PRIVATE',
  isHidden: true,
  joinApprovalRequired: true,
  isActive: true,
  status: 'ACTIVE',
  hasRoomKey: true,
  roomKeyUpdatedAt: '2026-01-01T00:00:00Z',
  memberCount: 2,
  pendingRequestCount: 1
};

const JOIN_REQUEST = {
  _id: 'jr-1',
  userId: { name: 'Jane Doe', email: 'jane@example.com' },
  routeId: 'RT-2',
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00Z'
};

const MEMBER = {
  _id: 'mem-1',
  userId: { _id: 'user-1', name: 'John Smith', email: 'john@example.com' },
  routeId: 'RT-2',
  status: 'ACTIVE',
  grantedVia: 'ROOM_KEY',
  grantedAt: '2026-01-01T00:00:00Z'
};

beforeEach(() => {
  vi.clearAllMocks();
  adminApi.getManagerOwnedRoutes.mockResolvedValue({ data: [PUBLIC_ROUTE, PRIVATE_ROUTE] });
  adminApi.getRouteJoinRequests.mockResolvedValue({ data: [] });
  adminApi.getRouteMembers.mockResolvedValue({ data: [] });
  adminApi.updateRoutePrivacy.mockResolvedValue({
    success: true,
    data: { routeId: 'RT-1', visibility: 'PRIVATE', isHidden: false, joinApprovalRequired: false, hasRoomKey: true }
  });
  adminApi.revealRoomKey.mockResolvedValue({ success: true, data: { routeId: 'RT-2', code: '123456' } });
  adminApi.rotateRoomKey.mockResolvedValue({ success: true, data: { routeId: 'RT-2', code: '654321' } });
  adminApi.decideJoinRequest.mockResolvedValue({ success: true, data: {} });
  adminApi.revokeRouteMember.mockResolvedValue({ success: true, data: {} });
});

describe('ManagerPrivateRoutesPage', () => {
  it('renders owned routes with privacy toggles', async () => {
    render(<ManagerPrivateRoutesPage />);
    await waitFor(() => expect(screen.getByText('Downtown Loop')).toBeTruthy());
    expect(screen.getByText('School Express')).toBeTruthy();
  });

  it('calls updateRoutePrivacy with the correct payload when the Private switch is toggled', async () => {
    render(<ManagerPrivateRoutesPage />);
    await waitFor(() => expect(screen.getByText('Downtown Loop')).toBeTruthy());

    const privateSwitch = screen.getByLabelText('Private toggle for RT-1');
    fireEvent.click(privateSwitch);

    await waitFor(() =>
      expect(adminApi.updateRoutePrivacy).toHaveBeenCalledWith('RT-1', { isPrivate: true })
    );
  });

  it('calls updateRoutePrivacy with correct payload for hidden toggle', async () => {
    render(<ManagerPrivateRoutesPage />);
    await waitFor(() => expect(screen.getByText('School Express')).toBeTruthy());

    const hiddenSwitch = screen.getByLabelText('Hidden toggle for RT-2');
    fireEvent.click(hiddenSwitch);

    await waitFor(() =>
      expect(adminApi.updateRoutePrivacy).toHaveBeenCalledWith('RT-2', { isHidden: false })
    );
  });

  it('disables hidden/approval switches for non-private routes', async () => {
    render(<ManagerPrivateRoutesPage />);
    await waitFor(() => expect(screen.getByText('Downtown Loop')).toBeTruthy());

    expect(screen.getByLabelText('Hidden toggle for RT-1')).toBeDisabled();
    expect(screen.getByLabelText('Require approval toggle for RT-1')).toBeDisabled();
  });

  it('reveals the room key after clicking reveal', async () => {
    render(<ManagerPrivateRoutesPage />);
    await waitFor(() => expect(screen.getByText('School Express')).toBeTruthy());

    fireEvent.click(screen.getAllByRole('button', { name: /manage/i }).find((btn) => !btn.disabled));
    await waitFor(() => expect(adminApi.getRouteJoinRequests).toHaveBeenCalledWith('RT-2', { status: 'PENDING' }));

    fireEvent.click(screen.getByRole('button', { name: /reveal room key/i }));

    await waitFor(() => expect(screen.getByTestId('room-key-display').textContent).toBe('123456'));
    expect(adminApi.revealRoomKey).toHaveBeenCalledWith('RT-2');
  });

  it('shows a confirm dialog before rotating and calls the API on confirm', async () => {
    render(<ManagerPrivateRoutesPage />);
    await waitFor(() => expect(screen.getByText('School Express')).toBeTruthy());

    fireEvent.click(screen.getAllByRole('button', { name: /manage/i }).find((btn) => !btn.disabled));
    await waitFor(() => expect(screen.getByText(/room key/i)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText(/does not kick them out/i)).toBeTruthy();

    fireEvent.click(dialog.getByRole('button', { name: /regenerate/i }));

    await waitFor(() => expect(adminApi.rotateRoomKey).toHaveBeenCalledWith('RT-2'));
  });

  it('renders pending join requests and calls decideJoinRequest for approve/reject', async () => {
    adminApi.getRouteJoinRequests.mockResolvedValue({ data: [JOIN_REQUEST] });
    render(<ManagerPrivateRoutesPage />);
    await waitFor(() => expect(screen.getByText('School Express')).toBeTruthy());

    const manageButtons = screen.getAllByRole('button', { name: /manage/i });
    fireEvent.click(manageButtons.find((btn) => !btn.disabled));
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() =>
      expect(adminApi.decideJoinRequest).toHaveBeenCalledWith('jr-1', { decision: 'APPROVED', note: '' })
    );

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));
    await waitFor(() =>
      expect(adminApi.decideJoinRequest).toHaveBeenCalledWith('jr-1', { decision: 'REJECTED', note: '' })
    );
  });

  it('renders members and calls revokeRouteMember on remove confirm', async () => {
    adminApi.getRouteMembers.mockResolvedValue({ data: [MEMBER] });
    render(<ManagerPrivateRoutesPage />);
    await waitFor(() => expect(screen.getByText('School Express')).toBeTruthy());

    const manageButtons = screen.getAllByRole('button', { name: /manage/i });
    fireEvent.click(manageButtons.find((btn) => !btn.disabled));
    await waitFor(() => expect(screen.getByText('John Smith')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));

    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: /remove/i }));

    await waitFor(() => expect(adminApi.revokeRouteMember).toHaveBeenCalledWith('RT-2', 'user-1'));
  });

  it('shows a snackbar and does not crash on a 403 error', async () => {
    adminApi.updateRoutePrivacy.mockRejectedValue(new Error('Not authorized to manage this route'));
    render(<ManagerPrivateRoutesPage />);
    await waitFor(() => expect(screen.getByText('Downtown Loop')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Private toggle for RT-1'));

    await waitFor(() => expect(screen.getByText(/not authorized to manage this route/i)).toBeTruthy());
  });
});
