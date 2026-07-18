import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ManagerPrivateRoutesPage } from '../ManagerPrivateRoutesPage';

vi.mock('@/hooks/use-private-routes', () => ({
  useManagerOwnedRoutes: vi.fn(),
  useRouteJoinRequests: vi.fn(),
  useRouteMembers: vi.fn(),
  useUpdateRoutePrivacy: vi.fn(),
  useRevealRoomKey: vi.fn(),
  useRotateRoomKey: vi.fn(),
  useDecideJoinRequest: vi.fn(),
  useRevokeRouteMember: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: vi.fn() }));

import {
  useManagerOwnedRoutes,
  useRouteJoinRequests,
  useRouteMembers,
  useUpdateRoutePrivacy,
  useRevealRoomKey,
  useRotateRoomKey,
  useDecideJoinRequest,
  useRevokeRouteMember,
} from '@/hooks/use-private-routes';
import { toast } from 'sonner';

const PUBLIC_ROUTE = {
  routeId: 'RT-1', routeName: 'Downtown Loop', source: 'A', destination: 'B',
  visibility: 'PUBLIC', isHidden: false, joinApprovalRequired: false,
  isActive: true, status: 'ACTIVE', hasRoomKey: false, memberCount: 0, pendingRequestCount: 0,
};
const PRIVATE_ROUTE = {
  routeId: 'RT-2', routeName: 'School Express', source: 'C', destination: 'D',
  visibility: 'PRIVATE', isHidden: true, joinApprovalRequired: true,
  isActive: true, status: 'ACTIVE', hasRoomKey: true, roomKeyUpdatedAt: '2026-01-01T00:00:00Z',
  memberCount: 2, pendingRequestCount: 1,
};
const JOIN_REQUEST = {
  _id: 'jr-1', userId: { name: 'Jane Doe', email: 'jane@example.com' },
  routeId: 'RT-2', status: 'PENDING', createdAt: '2026-01-01T00:00:00Z',
};
const MEMBER = {
  _id: 'mem-1', userId: { _id: 'user-1', name: 'John Smith', email: 'john@example.com' },
  routeId: 'RT-2', status: 'ACTIVE', grantedVia: 'ROOM_KEY', grantedAt: '2026-01-01T00:00:00Z',
};

function makeMutation(overrides = {}) {
  return { mutateAsync: vi.fn().mockResolvedValue({ data: {} }), isPending: false, ...overrides };
}

function defaultHooks({
  routes = [PUBLIC_ROUTE, PRIVATE_ROUTE],
  joinRequests = [],
  members = [],
  updatePrivacyMut, revealMut, rotateMut, decideMut, revokeMut,
} = {}) {
  useManagerOwnedRoutes.mockReturnValue({ data: { data: routes }, isLoading: false, error: null });
  useRouteJoinRequests.mockReturnValue({ data: { data: joinRequests }, isLoading: false });
  useRouteMembers.mockReturnValue({ data: { data: members }, isLoading: false });
  useUpdateRoutePrivacy.mockReturnValue(updatePrivacyMut || makeMutation());
  useRevealRoomKey.mockReturnValue(revealMut || makeMutation({ mutateAsync: vi.fn().mockResolvedValue({ data: { code: '123456' } }) }));
  useRotateRoomKey.mockReturnValue(rotateMut || makeMutation({ mutateAsync: vi.fn().mockResolvedValue({ data: { code: '654321' } }) }));
  useDecideJoinRequest.mockReturnValue(decideMut || makeMutation());
  useRevokeRouteMember.mockReturnValue(revokeMut || makeMutation());
}

function setup(opts) {
  defaultHooks(opts);
  render(<MemoryRouter><ManagerPrivateRoutesPage /></MemoryRouter>);
}

describe('ManagerPrivateRoutesPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders owned routes with privacy toggles', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Downtown Loop')).toBeTruthy());
    expect(screen.getByText('School Express')).toBeTruthy();
  });

  it('calls updateRoutePrivacy with the correct payload when the Private switch is toggled', async () => {
    const updatePrivacyMut = makeMutation();
    setup({ updatePrivacyMut });
    await waitFor(() => expect(screen.getByText('Downtown Loop')).toBeTruthy());

    const privateSwitch = screen.getByLabelText('Private toggle for RT-1');
    fireEvent.click(privateSwitch);

    await waitFor(() =>
      expect(updatePrivacyMut.mutateAsync).toHaveBeenCalledWith({
        routeId: 'RT-1',
        payload: { isPrivate: true },
      })
    );
  });

  it('calls updateRoutePrivacy with correct payload for hidden toggle', async () => {
    const updatePrivacyMut = makeMutation();
    setup({ updatePrivacyMut });
    await waitFor(() => expect(screen.getByText('School Express')).toBeTruthy());

    const hiddenSwitch = screen.getByLabelText('Hidden toggle for RT-2');
    fireEvent.click(hiddenSwitch);

    await waitFor(() =>
      expect(updatePrivacyMut.mutateAsync).toHaveBeenCalledWith({
        routeId: 'RT-2',
        payload: { isHidden: false },
      })
    );
  });

  it('disables hidden/approval switches for non-private routes', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Downtown Loop')).toBeTruthy());

    expect(screen.getByLabelText('Hidden toggle for RT-1')).toBeDisabled();
    expect(screen.getByLabelText('Require approval toggle for RT-1')).toBeDisabled();
  });

  it('reveals the room key after clicking reveal', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('School Express')).toBeTruthy());

    fireEvent.click(screen.getAllByRole('button', { name: /manage/i }).find((btn) => !btn.disabled));

    // Room key section appears
    await waitFor(() => expect(screen.getByTestId('room-key-display')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /reveal room key/i }));

    await waitFor(() => expect(screen.getByTestId('room-key-display').textContent).toBe('123456'));
  });

  it('shows a confirm dialog before rotating and calls rotateRoomKey on confirm', async () => {
    const rotateMut = makeMutation({ mutateAsync: vi.fn().mockResolvedValue({ data: { code: '654321' } }) });
    setup({ rotateMut });
    await waitFor(() => expect(screen.getByText('School Express')).toBeTruthy());

    fireEvent.click(screen.getAllByRole('button', { name: /manage/i }).find((btn) => !btn.disabled));
    await waitFor(() => expect(screen.getByRole('button', { name: /reveal room key/i })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText(/does not kick them out/i)).toBeTruthy();

    fireEvent.click(dialog.getByRole('button', { name: /regenerate/i }));

    await waitFor(() => expect(rotateMut.mutateAsync).toHaveBeenCalledWith('RT-2'));
  });

  it('renders pending join requests and calls decideJoinRequest for approve/reject', async () => {
    const decideMut = makeMutation();
    setup({ joinRequests: [JOIN_REQUEST], decideMut });

    await waitFor(() => expect(screen.getByText('School Express')).toBeTruthy());
    fireEvent.click(screen.getAllByRole('button', { name: /manage/i }).find((btn) => !btn.disabled));

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() =>
      expect(decideMut.mutateAsync).toHaveBeenCalledWith({
        id: 'jr-1',
        payload: { decision: 'APPROVED', note: '' },
      })
    );

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));
    await waitFor(() =>
      expect(decideMut.mutateAsync).toHaveBeenCalledWith({
        id: 'jr-1',
        payload: { decision: 'REJECTED', note: '' },
      })
    );
  });

  it('renders members and calls revokeRouteMember on remove confirm', async () => {
    const revokeMut = makeMutation();
    setup({ members: [MEMBER], revokeMut });

    await waitFor(() => expect(screen.getByText('School Express')).toBeTruthy());
    fireEvent.click(screen.getAllByRole('button', { name: /manage/i }).find((btn) => !btn.disabled));

    await waitFor(() => expect(screen.getByText('John Smith')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));

    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: /remove/i }));

    await waitFor(() =>
      expect(revokeMut.mutateAsync).toHaveBeenCalledWith({
        routeId: 'RT-2',
        userId: 'user-1',
      })
    );
  });

  it('shows a toast and does not crash on a 403 error', async () => {
    const updatePrivacyMut = makeMutation({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Not authorized to manage this route')),
    });
    setup({ updatePrivacyMut });
    await waitFor(() => expect(screen.getByText('Downtown Loop')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Private toggle for RT-1'));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.stringMatching(/not authorized to manage this route/i))
    );
  });
});
