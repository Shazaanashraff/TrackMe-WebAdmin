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

function seedStoredAuth() {
  localStorage.setItem('admin-auth', JSON.stringify({
    token: 'access-token-1',
    accessToken: 'access-token-1',
    refreshToken: 'refresh-token-1',
    rememberMe: true,
  }));
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
