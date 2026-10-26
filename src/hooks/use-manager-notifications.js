import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api';
import { qk } from '@/lib/queryKeys';
import { NOTIFICATION_EVENT, createNotificationSocket } from '@/lib/notification-socket';

// Live by socket, with a slow poll and a refetch on focus as the safety net for
// a dropped connection.
const FALLBACK_POLL_MS = 60_000;
const LIST_LIMIT = 20;

export function useManagerNotifications({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: qk.notifications.list(),
    queryFn: () => adminApi.getNotifications({ limit: LIST_LIMIT }),
    enabled,
    refetchInterval: FALLBACK_POLL_MS,
    refetchOnWindowFocus: true,
  });

  const unread = useQuery({
    queryKey: qk.notifications.unread(),
    queryFn: () => adminApi.getUnreadNotificationCount(),
    enabled,
    refetchInterval: FALLBACK_POLL_MS,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const socket = createNotificationSocket();
    const refresh = () => queryClient.invalidateQueries({ queryKey: qk.notifications.all() });
    socket.on(NOTIFICATION_EVENT, refresh);
    // Anything that arrived while disconnected shows up on reconnect.
    socket.on('connect', refresh);
    return () => {
      socket.off(NOTIFICATION_EVENT, refresh);
      socket.off('connect', refresh);
      socket.disconnect();
    };
  }, [enabled, queryClient]);

  return {
    notifications: list.data?.data || [],
    unreadCount: unread.data?.unreadCount || 0,
    isLoading: list.isLoading,
    isError: list.isError,
    refetch: list.refetch,
  };
}

// Read state flips in the cache at once, then the server confirms; a failure
// puts the cache back by refetching.
function markInCache(queryClient, predicate) {
  queryClient.setQueryData(qk.notifications.list(), (current) => (current?.data
    ? { ...current, data: current.data.map((n) => (predicate(n) ? { ...n, isRead: true } : n)) }
    : current));
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId) => adminApi.markNotificationRead(notificationId),
    onMutate: (notificationId) => {
      markInCache(queryClient, (n) => n._id === notificationId);
      queryClient.setQueryData(qk.notifications.unread(), (current) => (current
        ? { ...current, unreadCount: Math.max(0, (current.unreadCount || 0) - 1) }
        : current));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.notifications.all() }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.markAllNotificationsRead(),
    onMutate: () => {
      markInCache(queryClient, () => true);
      queryClient.setQueryData(qk.notifications.unread(), (current) => (current ? { ...current, unreadCount: 0 } : current));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.notifications.all() }),
  });
}
