import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminApi } from '../api';
import { writeStoredAuth, readStoredAuth } from '../lib/authSession';
import { API_MODES, setApiMode } from '../lib/apiMode';

// Exercises api.js's internal request()/refresh-retry/handleUnauthorized logic
// directly, through the public adminApi methods, with a mocked global fetch.
// Every other test file in this app mocks `adminApi` wholesale — this file is
// deliberately the one place that does NOT, so the actual HTTP/refresh layer
// gets real coverage.

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body)
});

const originalLocation = window.location;
let locationAssignSpy;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  global.fetch = vi.fn();

  locationAssignSpy = vi.fn();
  // jsdom's window.location.assign isn't directly spy-able (non-configurable
  // property on the real Location object), so swap the whole object out.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, assign: locationAssignSpy }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation
  });
});

describe('api.js request layer', () => {
  it('attaches the stored access token as a Bearer header', async () => {
    writeStoredAuth({ token: 'my-access-token', user: { role: 'super-admin' } }, true);
    global.fetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { managers: [] } }));

    await adminApi.getManagers();

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer my-access-token');
  });

  it('sends no Authorization header when there is no stored session', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { managers: [] } }));

    await adminApi.getManagers();

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('on a 401 for a retryable path: refreshes once, retries once, and returns the retried response', async () => {
    writeStoredAuth({ token: 'expired-token', refreshToken: 'refresh-1', user: { role: 'admin' } }, true);

    global.fetch
      .mockResolvedValueOnce(jsonResponse({ message: 'Not authorized, token failed' }, 401)) // original call
      .mockResolvedValueOnce(jsonResponse({ token: 'fresh-token', accessToken: 'fresh-token' }, 200)) // refresh call
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { managers: ['ok'] } }, 200)); // retried call

    const result = await adminApi.getManagers();

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result.data.managers).toEqual(['ok']);

    const [refreshUrl] = global.fetch.mock.calls[1];
    expect(refreshUrl).toContain('/api/auth/refresh-token');

    const [, retriedOptions] = global.fetch.mock.calls[2];
    expect(retriedOptions.headers.Authorization).toBe('Bearer fresh-token');

    // The refreshed token is now the one persisted for subsequent calls.
    expect(readStoredAuth().token).toBe('fresh-token');
  });

  it('does not attempt a refresh for a 401 on the login endpoint itself', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ message: 'Invalid credentials' }, 401));

    await expect(adminApi.login('nobody@trackme.com', 'wrong')).rejects.toThrow('Invalid credentials');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a refresh when there is no refreshToken stored, even on a retryable path', async () => {
    writeStoredAuth({ token: 'expired-token', user: { role: 'admin' } }, true); // no refreshToken
    global.fetch.mockResolvedValueOnce(jsonResponse({ message: 'Not authorized, token failed' }, 401));

    await expect(adminApi.getManagers()).rejects.toThrow('Not authorized, token failed');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('when the refresh call itself fails, surfaces the ORIGINAL request error and clears the stored session', async () => {
    writeStoredAuth({ token: 'expired-token', refreshToken: 'dead-refresh', user: { role: 'admin' } }, true);

    global.fetch
      .mockResolvedValueOnce(jsonResponse({ message: 'Not authorized, token failed' }, 401)) // original call
      .mockResolvedValueOnce(jsonResponse({ message: 'Refresh token expired' }, 401)); // refresh call fails

    await expect(adminApi.getManagers()).rejects.toThrow('Not authorized, token failed');
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // handleUnauthorized should have cleared the now-dead session.
    expect(readStoredAuth()).toBeNull();
    expect(locationAssignSpy).toHaveBeenCalledWith('/login?reason=session_expired');
  });

  it('a 403 that is not an auth-token message (permission-denied) does not clear the session', async () => {
    writeStoredAuth({ token: 'valid-token', refreshToken: 'refresh-1', user: { role: 'admin' } }, true);

    global.fetch
      .mockResolvedValueOnce(jsonResponse({ message: 'You do not have permission to do this' }, 403))
      .mockResolvedValueOnce(jsonResponse({ token: 'valid-token', accessToken: 'valid-token' }, 200))
      .mockResolvedValueOnce(jsonResponse({ message: 'You do not have permission to do this' }, 403));

    await expect(adminApi.getManagers()).rejects.toThrow('You do not have permission to do this');

    // handleUnauthorized's own message check means a non-token-related 403
    // does not clear a still-otherwise-valid session.
    expect(readStoredAuth()).not.toBeNull();
  });

  it('surfaces only the first field-validation error when the backend returns multiple', async () => {
    global.fetch.mockResolvedValueOnce(
      jsonResponse(
        {
          message: 'Validation failed',
          errors: [{ msg: 'Email is invalid' }, { msg: 'Name is required' }]
        },
        400
      )
    );

    await expect(adminApi.createManager({ email: 'bad', name: '' })).rejects.toThrow('Email is invalid');
  });

  it('falls back to data.message when there is no errors array', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ message: 'Manager already exists' }, 409));

    await expect(adminApi.createManager({ email: 'x@y.com', name: 'X' })).rejects.toThrow(
      'Manager already exists'
    );
  });

  it('attaches error.status matching the HTTP response status', async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ message: 'Conflict' }, 409));

    try {
      await adminApi.createManager({ email: 'x@y.com', name: 'X' });
      throw new Error('expected createManager to reject');
    } catch (err) {
      expect(err.status).toBe(409);
    }
  });

  it('does not throw when the response body is not valid JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input'))
    });

    await expect(adminApi.getManagers()).resolves.toEqual({});
  });

  it('requests go to the sandbox backend once Developer Mode\'s toggle is flipped on', async () => {
    setApiMode(API_MODES.SANDBOX);
    global.fetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { managers: [] } }));

    await adminApi.getManagers();

    const [url] = global.fetch.mock.calls[0];
    expect(url).toMatch(/^http:\/\/localhost:5001\//);
  });

  it('always targets the primary backend outside a DEV build, even if sandbox was toggled on', async () => {
    setApiMode(API_MODES.SANDBOX);
    vi.stubEnv('DEV', false);
    global.fetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { managers: [] } }));

    await adminApi.getManagers();

    const [url] = global.fetch.mock.calls[0];
    expect(url).toMatch(/^http:\/\/localhost:5000\//);
  });
});
