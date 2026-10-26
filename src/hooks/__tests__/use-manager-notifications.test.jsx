import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The manager's notification bell data: list + unread count over REST, kept
// live by the `notification:new` socket event, with optimistic read marking.

const mocks = vi.hoisted(() => {
  const listeners = {};
  const socket = {
    on: vi.fn((event, callback) => { listeners[event] = callback; }),
    off: vi.fn(),
    disconnect: vi.fn(),
  };
  return {
    listeners,
    socket,
    getNotifications: vi.fn(),
    getUnreadNotificationCount: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    createNotificationSocket: vi.fn(() => socket),
  };
});

vi.mock('@/api', () => ({
  adminApi: {
    getNotifications: mocks.getNotifications,
    getUnreadNotificationCount: mocks.getUnreadNotificationCount,
    markNotificationRead: mocks.markNotificationRead,
    markAllNotificationsRead: mocks.markAllNotificationsRead,
  },
}));
vi.mock('@/lib/notification-socket', () => ({
  NOTIFICATION_EVENT: 'notification:new',
  createNotificationSocket: mocks.createNotificationSocket,
}));

import {
  useManagerNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/hooks/use-manager-notifications';

const LEFT = { _id: 'n1', title: 'Rider left', message: 'Amal left.', isRead: false, createdAt: '2026-10-25T10:00:00.000Z' };
const BACK = { _id: 'n2', title: 'Rider is back', message: 'Amal is back.', isRead: false, createdAt: '2026-10-25T11:00:00.000Z' };

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

function useBell() {
  return {
    bell: useManagerNotifications(),
    markRead: useMarkNotificationRead(),
    markAll: useMarkAllNotificationsRead(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getNotifications.mockResolvedValue({ data: [BACK, LEFT] });
  mocks.getUnreadNotificationCount.mockResolvedValue({ unreadCount: 2 });
  mocks.markNotificationRead.mockResolvedValue({ success: true });
  mocks.markAllNotificationsRead.mockResolvedValue({ success: true });
});

describe('useManagerNotifications', () => {
  it('loads the list and the unread count', async () => {
    const { result } = renderHook(() => useManagerNotifications(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    expect(result.current.unreadCount).toBe(2);
    expect(mocks.getNotifications).toHaveBeenCalledWith({ limit: 20 });
  });

  it('refetches when the socket announces a new notification, and closes the socket on unmount', async () => {
    const { result, unmount } = renderHook(() => useManagerNotifications(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.unreadCount).toBe(2));

    mocks.getNotifications.mockResolvedValue({ data: [{ ...LEFT, _id: 'n3' }, BACK, LEFT] });
    mocks.getUnreadNotificationCount.mockResolvedValue({ unreadCount: 3 });
    await act(async () => { await mocks.listeners['notification:new']({ notificationId: 'n3' }); });

    await waitFor(() => expect(result.current.unreadCount).toBe(3));
    expect(result.current.notifications).toHaveLength(3);

    unmount();
    expect(mocks.socket.disconnect).toHaveBeenCalled();
  });

  it('opens no socket and fetches nothing when disabled', () => {
    renderHook(() => useManagerNotifications({ enabled: false }), { wrapper: wrapper() });
    expect(mocks.createNotificationSocket).not.toHaveBeenCalled();
    expect(mocks.getNotifications).not.toHaveBeenCalled();
  });
});

describe('marking notifications read', () => {
  it('marks one read at once in the list and the count, then confirms with the server', async () => {
    let finish;
    mocks.markNotificationRead.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useBell(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.bell.unreadCount).toBe(2));

    act(() => { result.current.markRead.mutate('n1'); });
    await waitFor(() => expect(result.current.bell.unreadCount).toBe(1));
    expect(result.current.bell.notifications.find((n) => n._id === 'n1').isRead).toBe(true);
    expect(mocks.markNotificationRead).toHaveBeenCalledWith('n1');

    await act(async () => finish({ success: true }));
  });

  it('marks all read', async () => {
    const { result } = renderHook(() => useBell(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.bell.unreadCount).toBe(2));
    mocks.getUnreadNotificationCount.mockResolvedValue({ unreadCount: 0 });
    mocks.getNotifications.mockResolvedValue({ data: [{ ...BACK, isRead: true }, { ...LEFT, isRead: true }] });

    await act(async () => { await result.current.markAll.mutateAsync(); });

    expect(mocks.markAllNotificationsRead).toHaveBeenCalled();
    await waitFor(() => expect(result.current.bell.unreadCount).toBe(0));
    expect(result.current.bell.notifications.every((n) => n.isRead)).toBe(true);
  });
});
