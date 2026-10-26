import { io } from 'socket.io-client';
import { getApiBaseUrl } from './apiMode';
import { readStoredAuth } from './authSession';

// The backend announces every stored notification on the recipient's room the
// moment it exists (backend utils/notificationEvents.js); a manager's socket
// joins `account:<managerId>` on connect.
export const NOTIFICATION_EVENT = 'notification:new';

// `auth` is a function so every reconnect reads the current token, not the one
// that was stored when the bell first mounted (access tokens last 15 minutes).
export function createNotificationSocket() {
  return io(getApiBaseUrl(), {
    transports: ['websocket'],
    auth: (callback) => {
      const stored = readStoredAuth();
      callback({ token: stored?.token || stored?.accessToken || '' });
    },
  });
}
