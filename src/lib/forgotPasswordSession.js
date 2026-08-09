// Carries the in-progress forgot-password flow (email, then resetToken) across a
// same-tab refresh at any step. React Router `location.state` alone doesn't
// survive a refresh, which used to force a full restart of the flow —
// including waiting for and re-entering a fresh OTP — for what looked like an
// unexplained error. sessionStorage clears itself when the tab closes, so this
// never outlives the browsing session it belongs to.
const STORAGE_KEY = 'forgot-password-flow';

const isBrowser = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export function readForgotPasswordState() {
  if (!isBrowser()) return null;

  try {
    return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveForgotPasswordState(partial) {
  if (!isBrowser()) return;

  const existing = readForgotPasswordState() || {};
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...partial }));
}

export function clearForgotPasswordState() {
  if (!isBrowser()) return;

  window.sessionStorage.removeItem(STORAGE_KEY);
}
