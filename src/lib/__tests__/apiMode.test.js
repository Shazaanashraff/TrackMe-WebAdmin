import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { API_MODES, getApiMode, getApiBaseUrl, setApiMode, subscribeApiMode } from '../apiMode';
import { queryClient } from '../queryClient';

describe('apiMode', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it('defaults to primary with no stored mode', () => {
    expect(getApiMode()).toBe(API_MODES.PRIMARY);
    expect(getApiBaseUrl()).toBe('http://localhost:5000');
  });

  it('switches the base URL to the sandbox backend once toggled on', () => {
    setApiMode(API_MODES.SANDBOX);

    expect(getApiMode()).toBe(API_MODES.SANDBOX);
    expect(getApiBaseUrl()).toBe('http://localhost:5001');
  });

  it('persists the mode across calls via localStorage', () => {
    setApiMode(API_MODES.SANDBOX);
    expect(window.localStorage.getItem('webadmin-api-mode')).toBe('sandbox');

    setApiMode(API_MODES.PRIMARY);
    expect(window.localStorage.getItem('webadmin-api-mode')).toBe('primary');
  });

  it('clears the TanStack Query cache on every mode change (issue: stale cross-mode data)', () => {
    const clearSpy = vi.spyOn(queryClient, 'clear');

    setApiMode(API_MODES.SANDBOX);

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers with the new mode', () => {
    const callback = vi.fn();
    const unsubscribe = subscribeApiMode(callback);

    setApiMode(API_MODES.SANDBOX);
    expect(callback).toHaveBeenCalledWith(API_MODES.SANDBOX);

    unsubscribe();
    setApiMode(API_MODES.PRIMARY);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('forces primary and ignores writes when not a DEV build', () => {
    vi.stubEnv('DEV', false);

    setApiMode(API_MODES.SANDBOX);

    expect(getApiMode()).toBe(API_MODES.PRIMARY);
    expect(getApiBaseUrl()).toBe('http://localhost:5000');
    expect(window.localStorage.getItem('webadmin-api-mode')).toBeNull();
  });

  it('returns primary even if sandbox was already stored before a production build', () => {
    window.localStorage.setItem('webadmin-api-mode', 'sandbox');
    vi.stubEnv('DEV', false);

    expect(getApiBaseUrl()).toBe('http://localhost:5000');
  });
});
