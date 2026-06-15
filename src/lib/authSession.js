const STORAGE_KEY = 'admin-auth';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const safeParse = (value) => {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeAuth = (auth = {}, rememberMe = false) => ({
  ...auth,
  token: auth?.token || auth?.accessToken || null,
  accessToken: auth?.accessToken || auth?.token || null,
  refreshToken: auth?.refreshToken || null,
  rememberMe: Boolean(auth?.rememberMe ?? rememberMe)
});

export const readStoredAuth = () => {
  if (!isBrowser()) return null;

  const localAuth = safeParse(window.localStorage.getItem(STORAGE_KEY));
  const sessionAuth = safeParse(window.sessionStorage.getItem(STORAGE_KEY));
  const storedAuth = localAuth || sessionAuth;

  return storedAuth ? normalizeAuth(storedAuth, storedAuth.rememberMe) : null;
};

export const writeStoredAuth = (auth, rememberMe = false) => {
  const normalizedAuth = normalizeAuth(auth, rememberMe);

  if (!isBrowser()) {
    return normalizedAuth;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);

  const serializedAuth = JSON.stringify(normalizedAuth);
  if (normalizedAuth.rememberMe) {
    window.localStorage.setItem(STORAGE_KEY, serializedAuth);
  } else {
    window.sessionStorage.setItem(STORAGE_KEY, serializedAuth);
  }

  return normalizedAuth;
};

export const clearStoredAuth = () => {
  if (!isBrowser()) return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
};

const decodeBase64Url = (input) => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(padded);
  }

  return Buffer.from(padded, 'base64').toString('utf8');
};

export const getJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    return JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return null;
  }
};

export const isJwtExpired = (token, skewSeconds = 0) => {
  const payload = getJwtPayload(token);
  if (!payload?.exp) return false;

  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
};
