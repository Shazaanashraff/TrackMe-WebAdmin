import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminApi } from '../api';

function mockFetchOnce(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('api.js request error handling', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('surfaces every backend field-validation error, not just the first (issue #42)', async () => {
    mockFetchOnce(400, {
      errors: [{ message: 'Route ID is required' }, { message: 'Route Name is required' }],
    });

    await expect(adminApi.createSystemRoute({})).rejects.toThrow(
      'Route ID is required; Route Name is required'
    );
  });

  it('exposes the full field-error list on the thrown error for list-style rendering', async () => {
    mockFetchOnce(400, { errors: [{ message: 'A is required' }, { message: 'B is required' }] });

    await adminApi.createSystemRoute({}).catch((err) => {
      expect(err.fieldErrors).toEqual(['A is required', 'B is required']);
    });
  });

  it('falls back to data.message when the backend sends no field errors', async () => {
    mockFetchOnce(500, { message: 'Internal error' });

    await expect(adminApi.createSystemRoute({})).rejects.toThrow('Internal error');
  });
});

describe('api.js live tracking', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('loads the authenticated manager fleet snapshot from the live endpoint', async () => {
    mockFetchOnce(200, { success: true, data: [] });

    await adminApi.getManagerFleetLive();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/manager/vehicles/live'),
      expect.any(Object),
    );
  });
});

function seedStoredAuth(token = 'access-token-1') {
  localStorage.setItem('admin-auth', JSON.stringify({
    token,
    accessToken: token,
    refreshToken: 'refresh-token-1',
    rememberMe: true,
  }));
}

function base64UrlEncode(obj) {
  const base64 = btoa(JSON.stringify(obj));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt(expSecondsFromNow) {
  const header = base64UrlEncode({ alg: 'none', typ: 'JWT' });
  const payload = base64UrlEncode({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow });
  return `${header}.${payload}.sig`;
}

describe('api.js token-refresh retry gating (issue #47)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does not attempt a token refresh + retry on a permission-denied 403', async () => {
    seedStoredAuth();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Access denied. Allowed roles: super-admin' }),
    });
    globalThis.fetch = fetchMock;

    await expect(adminApi.getSuperAdminDashboard()).rejects.toThrow(
      'Access denied. Allowed roles: super-admin'
    );
    // Exactly one call — no refresh call, no retried original request.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still attempts a token refresh + retry on a 401 (token actually expired)', async () => {
    seedStoredAuth();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Not authorized, token failed' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ token: 'access-token-2', accessToken: 'access-token-2', refreshToken: 'refresh-token-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { totalManagers: 1 } }),
      });
    globalThis.fetch = fetchMock;

    const result = await adminApi.getSuperAdminDashboard();

    expect(result).toEqual({ data: { totalManagers: 1 } });
    // Original 401 request, the refresh call, and the retried original request.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('api.js single-flight token refresh (issue #53)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shares one refresh call across concurrent 401s instead of each request refreshing independently', async () => {
    seedStoredAuth();

    const fetchMock = vi.fn((url, opts = {}) => {
      if (url.includes('/api/auth/refresh-token')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ token: 'access-token-2', accessToken: 'access-token-2', refreshToken: 'refresh-token-1' }),
        });
      }
      if (opts.retryAfterRefresh === false) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: 'ok' }) });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Not authorized, token failed' }),
      });
    });
    globalThis.fetch = fetchMock;

    await Promise.all([adminApi.getSuperAdminDashboard(), adminApi.getManagers()]);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) => url.includes('/api/auth/refresh-token'));
    expect(refreshCalls).toHaveLength(1);
  });
});

describe('api.js proactive token refresh (issue #54)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('refreshes an already-expired token before firing the request, instead of only reacting to a 401', async () => {
    const expiredToken = makeJwt(-60);
    seedStoredAuth(expiredToken);

    const fetchMock = vi.fn((url) => {
      if (url.includes('/api/auth/refresh-token')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ token: 'fresh-access-token', accessToken: 'fresh-access-token', refreshToken: 'refresh-token-1' }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: { totalManagers: 1 } }) });
    });
    globalThis.fetch = fetchMock;

    await adminApi.getSuperAdminDashboard();

    // Exactly a refresh call followed by the real request — no failed 401 attempt first.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [refreshCall, realCall] = fetchMock.mock.calls;
    expect(refreshCall[0]).toContain('/api/auth/refresh-token');
    expect(realCall[0]).toContain('/api/super-admin/dashboard');
    expect(realCall[1].headers.Authorization).toBe('Bearer fresh-access-token');
  });

  it('does not refresh a token that is not yet expired', async () => {
    seedStoredAuth(makeJwt(60 * 15));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { totalManagers: 1 } }),
    });
    globalThis.fetch = fetchMock;

    await adminApi.getSuperAdminDashboard();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a proactive refresh on a refresh-exempt path (e.g. login)', async () => {
    seedStoredAuth(makeJwt(-60));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: 'ignored', user: { role: 'admin' } }),
    });
    globalThis.fetch = fetchMock;

    await adminApi.login('manager@trackme.com', 'secret');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
