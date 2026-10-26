import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RelativeTime } from '@/components/shared/relative-time';
import {
  useManagerNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/hooks/use-manager-notifications';

// The manager's notices, from the Topbar: today, a rider leaving or coming back
// because of an account deletion (backend services/accountDeletion.js).
//
// Motion is kept to what explains something: the badge pops in when the count
// changes (keyed on the count, so each new notice plays it once), the panel
// scales out of the bell it belongs to, and the bell gives under a press.
// `motion-safe:` drops all of it under Reduce Motion.
const EASE_OUT = 'ease-[cubic-bezier(0.23,1,0.32,1)]';

function badgeText(count) {
  return count > 9 ? '9+' : String(count);
}

function NotificationRow({ notification, onOpen }) {
  const unread = !notification.isRead;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className={cn(
          'flex w-full gap-3 px-4 py-3 text-left transition-colors duration-150',
          'hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none active:bg-surface-muted',
        )}
        aria-label={`${notification.title}. ${notification.message}${unread ? ' Unread.' : ''}`}
      >
        <span
          aria-hidden
          className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', unread ? 'bg-primary' : 'bg-transparent')}
        />
        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm', unread ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
            {notification.title}
          </span>
          <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{notification.message}</span>
          <span className="mt-1 block text-xs"><RelativeTime date={notification.createdAt} /></span>
        </span>
      </button>
    </li>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, isError, refetch } = useManagerNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const open = (notification) => {
    if (!notification.isRead) markRead.mutate(notification._id);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className={cn('relative motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.97]', EASE_OUT)}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span
              key={unreadCount}
              data-testid="notification-badge"
              className={cn(
                'pointer-events-none absolute right-1 top-1 h-4 min-w-4 rounded-full bg-destructive px-1',
                'text-center text-[10px] font-semibold leading-4 text-destructive-foreground tabular-nums',
                'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 motion-safe:duration-200',
                EASE_OUT,
              )}
            >
              {badgeText(unreadCount)}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[22rem] max-w-[calc(100vw-2rem)] origin-[var(--radix-popover-content-transform-origin)] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={unreadCount === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        </div>

        <div className="max-h-[24rem] overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="space-y-3 p-4" aria-label="Loading notifications">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : isError ? (
            <div className="space-y-2 p-4 text-sm">
              <p className="text-muted-foreground">Could not load notifications.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-border" data-testid="notification-list">
              {notifications.map((notification) => (
                <NotificationRow key={notification._id} notification={notification} onOpen={open} />
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
