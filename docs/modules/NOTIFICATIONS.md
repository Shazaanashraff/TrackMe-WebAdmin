# NOTIFICATIONS — Pingo Admin Portal (manager bell)

**Status:** shipped 2026-10-25 on `feature/account-deletion-password` (passenger issues #58, #59).

## 1. Purpose

A bell in the manager's Topbar that lists the manager's own notices and counts the unread ones.
Today the only notices are about riders and account deletion, written by the backend
(`backend/src/services/accountDeletion.js`):

- `RIDER_ACCOUNT_DELETED` "Rider left": a rider was taken off one of the manager's drivers (or
  their pending request was withdrawn) because they asked to delete their account.
- `RIDER_ACCOUNT_RESTORED` "Rider is back": the rider kept their account within the grace period
  and the enrollment was restored.

The manager also gets each one by email. Super-admins have no notices, so they get no bell.

## 2. Key files (one job each)

| File | Job |
|---|---|
| `src/components/manager/notification-bell.jsx` | Bell button, unread badge (9+ cap), popover panel with list, empty, loading and error states, "Mark all read". |
| `src/hooks/use-manager-notifications.js` | `useManagerNotifications` (list + unread count, socket-driven refresh, 60 s poll + focus refetch as the fallback), `useMarkNotificationRead`, `useMarkAllNotificationsRead` (optimistic). |
| `src/lib/notification-socket.js` | `createNotificationSocket()`: a Socket.IO client whose `auth` callback reads the current token on every (re)connect. |
| `src/api.js` | `getNotifications`, `getUnreadNotificationCount`, `markNotificationRead`, `markAllNotificationsRead`. |
| `src/layout/Topbar.jsx` | Renders the bell for managers only. |

## 3. Data flow

Mount → `GET /api/notifications?limit=20` and `GET /api/notifications/count/unread`. The backend
emits `notification:new` to `account:<managerId>` when a manager notice is stored; the hook
invalidates both queries on that event and on every socket `connect`. Opening a row marks it read
(`PUT /api/notifications/:id/read`); "Mark all read" calls `PUT /api/notifications/read-all`.
Both update the cache first and refetch after.

## 4. Contracts (API / socket / storage)

- REST: the shared `/api/notifications` routes. For role `admin` (manager) the backend scopes them
  to the caller's own Manager id (`notificationController.resolveScopedUserIds`).
- Row shape used: `{ _id, type, title, message, isRead, createdAt }`.
- Socket: `notification:new` `{ notificationId, type, title, studentId, createdAt }`, see
  `backend/docs/modules/NOTIFICATIONS.md`.
- No local storage.

## 5. Not visible in the frontend

- Notices expire after 30 days (backend TTL).
- After the rider's account is purged, the backend rewrites "Rider left" notices without the name.

## 6. Known gotchas / regressions

- The socket is separate from the tracking page's socket; both are cheap, and the bell must work
  on every page.
- An expired access token makes the socket handshake fail until the next reconnect after a REST
  refresh; the 60 s poll covers that gap.

## 7. Tests covering this module

| Layer | File |
|---|---|
| Unit | `src/components/manager/__tests__/notification-bell.test.jsx` |
| Unit | `src/hooks/__tests__/use-manager-notifications.test.jsx` |
| Unit | `src/layout/__tests__/Topbar.test.jsx` (bell for managers only) |

## 8. Change protocol

A new manager notice type needs nothing here unless it should look different; a change to the
`/api/notifications` contract or the socket payload must update this doc and the backend's
NOTIFICATIONS.md together.
