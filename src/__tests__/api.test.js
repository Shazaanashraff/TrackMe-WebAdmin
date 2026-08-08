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
