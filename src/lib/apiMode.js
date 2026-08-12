import { queryClient } from './queryClient';

// Developer Mode's sandbox/primary toggle. See DEVELOPER_MODE_PLAN.md and
// docs/modules/DEVELOPER_MODE.md — dev-only by construction, not by configuration:
// getApiBaseUrl() returns the primary URL unconditionally when `import.meta.env.DEV`
// is false, so a production build can never resolve to the sandbox backend even if
// something wrote `sandbox` into localStorage.

export const API_MODES = { PRIMARY: 'primary', SANDBOX: 'sandbox' };

const STORAGE_KEY = 'webadmin-api-mode';
const MODE_CHANGE_EVENT = 'trackme:apimode';

const PRIMARY_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SANDBOX_URL = import.meta.env.VITE_SANDBOX_API_URL || 'http://localhost:5001';

export function getApiMode() {
  if (!import.meta.env.DEV) return API_MODES.PRIMARY;
  try {
    return localStorage.getItem(STORAGE_KEY) === API_MODES.SANDBOX ? API_MODES.SANDBOX : API_MODES.PRIMARY;
  } catch {
    return API_MODES.PRIMARY;
  }
}

// Every request in api.js calls this instead of a module-level constant, so the base
// URL can actually change at runtime when the toggle flips (see api.js's `request()`
// and `refreshStoredAuth()`).
export function getApiBaseUrl() {
  if (!import.meta.env.DEV) return PRIMARY_URL;
  return getApiMode() === API_MODES.SANDBOX ? SANDBOX_URL : PRIMARY_URL;
}

// Without this, TanStack Query keeps serving cached primary-backend data while the
// badge already says sandbox (or vice versa) — the exact confusion this feature exists
// to prevent.
export function setApiMode(mode) {
  if (!import.meta.env.DEV) return;
  const next = mode === API_MODES.SANDBOX ? API_MODES.SANDBOX : API_MODES.PRIMARY;

  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // storage unavailable — the toggle still works for this tab via the event below
  }

  queryClient.clear();
  window.dispatchEvent(new CustomEvent(MODE_CHANGE_EVENT, { detail: next }));
}

export function subscribeApiMode(callback) {
  const handler = (event) => callback(event.detail);
  window.addEventListener(MODE_CHANGE_EVENT, handler);
  return () => window.removeEventListener(MODE_CHANGE_EVENT, handler);
}
