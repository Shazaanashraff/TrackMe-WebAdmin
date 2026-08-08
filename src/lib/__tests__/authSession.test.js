import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readStoredAuth,
  writeStoredAuth,
  clearStoredAuth,
  getJwtPayload,
  isJwtExpired
} from '../authSession';

const STORAGE_KEY = 'admin-auth';

// Builds a real base64url-encoded JWT shape (header.payload.signature) so
// getJwtPayload/isJwtExpired exercise the actual decode path, not a stub.
function makeJwt(payload) {
  const base64url = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.fake-signature`;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('writeStoredAuth', () => {
  it('rememberMe=true writes to localStorage and clears sessionStorage', () => {
    writeStoredAuth({ token: 't1', user: { role: 'admin' } }, true);

    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('rememberMe=false writes to sessionStorage and clears localStorage', () => {
    writeStoredAuth({ token: 't1', user: { role: 'admin' } }, false);

    expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('switching remember-me from true to false removes the stale localStorage copy', () => {
    writeStoredAuth({ token: 't1' }, true);
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    writeStoredAuth({ token: 't2' }, false);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)).token).toBe('t2');
  });

  it('normalizes token/accessToken so either field populates both', () => {
    const stored = writeStoredAuth({ accessToken: 'only-access-token' }, true);
    expect(stored.token).toBe('only-access-token');
    expect(stored.accessToken).toBe('only-access-token');
  });

  it('defaults refreshToken to null and rememberMe to the passed flag when absent from the input', () => {
    const stored = writeStoredAuth({ token: 't1' }, true);
    expect(stored.refreshToken).toBeNull();
    expect(stored.rememberMe).toBe(true);
  });

  it('returns the normalized auth object even when window is unavailable', () => {
    // Simulates an SSR/non-browser environment without needing a separate module registry.
    const originalWindow = global.window;
    // eslint-disable-next-line no-global-assign
    global.window = undefined;

    try {
      const result = writeStoredAuth({ token: 't1' }, true);
      expect(result.token).toBe('t1');
    } finally {
      // eslint-disable-next-line no-global-assign
      global.window = originalWindow;
    }
  });
});

describe('readStoredAuth', () => {
  it('returns null when nothing is stored', () => {
    expect(readStoredAuth()).toBeNull();
  });

  it('reads back a session written with rememberMe=true', () => {
    writeStoredAuth({ token: 't1', user: { role: 'super-admin' } }, true);
    const result = readStoredAuth();
    expect(result.token).toBe('t1');
    expect(result.user.role).toBe('super-admin');
    expect(result.rememberMe).toBe(true);
  });

  it('reads back a session written with rememberMe=false', () => {
    writeStoredAuth({ token: 't1' }, false);
    const result = readStoredAuth();
    expect(result.token).toBe('t1');
    expect(result.rememberMe).toBe(false);
  });

  it('prefers localStorage over sessionStorage when both are populated', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'from-local', rememberMe: true }));
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'from-session', rememberMe: false }));

    expect(readStoredAuth().token).toBe('from-local');
  });

  it('falls back to sessionStorage when localStorage is empty', () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'from-session', rememberMe: false }));

    expect(readStoredAuth().token).toBe('from-session');
  });

  it('returns null instead of throwing when localStorage holds corrupt JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-valid-json');

    expect(readStoredAuth()).toBeNull();
  });

  it('falls back to sessionStorage when localStorage holds corrupt JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-valid-json');
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'from-session', rememberMe: false }));

    expect(readStoredAuth().token).toBe('from-session');
  });
});

describe('clearStoredAuth', () => {
  it('removes the session from both storages', () => {
    writeStoredAuth({ token: 't1' }, true);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'leftover' }));

    clearStoredAuth();

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(readStoredAuth()).toBeNull();
  });

  it('is a no-op (does not throw) when nothing was stored', () => {
    expect(() => clearStoredAuth()).not.toThrow();
  });
});

describe('getJwtPayload', () => {
  it('decodes a well-formed token payload', () => {
    const token = makeJwt({ id: 'user-1', role: 'admin', exp: 9999999999 });
    const payload = getJwtPayload(token);

    expect(payload).toEqual({ id: 'user-1', role: 'admin', exp: 9999999999 });
  });

  it('returns null for a missing token', () => {
    expect(getJwtPayload(null)).toBeNull();
    expect(getJwtPayload(undefined)).toBeNull();
    expect(getJwtPayload('')).toBeNull();
  });

  it('returns null for a non-string token', () => {
    expect(getJwtPayload(12345)).toBeNull();
  });

  it('returns null for a token with fewer than 2 segments', () => {
    expect(getJwtPayload('not-a-jwt')).toBeNull();
  });

  it('returns null when the payload segment is not valid base64url JSON', () => {
    expect(getJwtPayload('header.%%%not-base64%%%.signature')).toBeNull();
  });
});

describe('isJwtExpired', () => {
  it('returns false for a token with a future exp', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt({ exp: futureExp });

    expect(isJwtExpired(token)).toBe(false);
  });

  it('returns true for a token with a past exp', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const token = makeJwt({ exp: pastExp });

    expect(isJwtExpired(token)).toBe(true);
  });

  it('returns false when the token has no exp claim at all', () => {
    const token = makeJwt({ id: 'user-1' });

    expect(isJwtExpired(token)).toBe(false);
  });

  it('returns false for an undecodable token (fails open, matching getJwtPayload returning null)', () => {
    expect(isJwtExpired('garbage')).toBe(false);
  });

  it('treats a token expiring within the skew window as already expired', () => {
    const expInThirtySeconds = Math.floor(Date.now() / 1000) + 30;
    const token = makeJwt({ exp: expInThirtySeconds });

    expect(isJwtExpired(token, 60)).toBe(true);
    expect(isJwtExpired(token, 10)).toBe(false);
  });
});
