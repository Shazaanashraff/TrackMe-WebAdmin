import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';

// The Topbar bell: a badge with the unread count, and a panel listing the
// manager's notices with read state, empty, loading and error states.

const mocks = vi.hoisted(() => ({
  bell: {},
  markRead: vi.fn(),
  markAll: vi.fn(),
}));

vi.mock('@/hooks/use-manager-notifications', () => ({
  useManagerNotifications: () => mocks.bell,
  useMarkNotificationRead: () => ({ mutate: mocks.markRead, isPending: false }),
  useMarkAllNotificationsRead: () => ({ mutate: mocks.markAll, isPending: false }),
}));

import { NotificationBell } from '../notification-bell';

const LEFT = {
  _id: 'n1',
  title: 'Rider left',
  message: "Amal Perera left Driver One's shuttle because they are deleting their account.",
  isRead: false,
  createdAt: new Date().toISOString(),
};
const BACK = { ...LEFT, _id: 'n2', title: 'Rider is back', message: 'Amal Perera is back.', isRead: true };

function renderBell(bell) {
  mocks.bell = { notifications: [], unreadCount: 0, isLoading: false, isError: false, refetch: vi.fn(), ...bell };
  return render(<TooltipProvider><NotificationBell /></TooltipProvider>);
}

beforeEach(() => vi.clearAllMocks());

describe('NotificationBell', () => {
  it('shows the unread count on the bell and in its label', () => {
    renderBell({ notifications: [LEFT, BACK], unreadCount: 1 });
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
  });

  it('caps the badge at 9+', () => {
    renderBell({ unreadCount: 14 });
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('9+');
  });

  it('shows no badge when everything is read', () => {
    renderBell({ notifications: [BACK], unreadCount: 0 });
    expect(screen.queryByTestId('notification-badge')).toBeNull();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('lists the notices and marks an unread one read when opened', async () => {
    const user = userEvent.setup();
    renderBell({ notifications: [LEFT, BACK], unreadCount: 1 });
    await user.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));

    expect(screen.getByTestId('notification-list')).toBeInTheDocument();
    expect(screen.getByText('Rider left')).toBeInTheDocument();
    expect(screen.getByText('Rider is back')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Rider left\..*Unread\./ }));
    expect(mocks.markRead).toHaveBeenCalledWith('n1');

    // An already-read notice is not sent again.
    await user.click(screen.getByRole('button', { name: /^Rider is back\./ }));
    expect(mocks.markRead).toHaveBeenCalledTimes(1);
  });

  it('marks all read, and disables that when nothing is unread', async () => {
    const user = userEvent.setup();
    const { unmount } = renderBell({ notifications: [LEFT], unreadCount: 1 });
    await user.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));
    await user.click(screen.getByRole('button', { name: 'Mark all read' }));
    expect(mocks.markAll).toHaveBeenCalledTimes(1);
    unmount();

    renderBell({ notifications: [BACK], unreadCount: 0 });
    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByRole('button', { name: 'Mark all read' })).toBeDisabled();
  });

  it('says so when there is nothing yet', async () => {
    const user = userEvent.setup();
    renderBell({});
    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('No notifications yet.')).toBeInTheDocument();
  });

  it('offers a retry when the list fails to load', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    renderBell({ isError: true, refetch });
    await user.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('Could not load notifications.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });
});
