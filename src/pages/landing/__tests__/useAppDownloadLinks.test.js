import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppDownloadLinks } from '../useAppDownloadLinks';
import { APP_LINKS } from '../config';

// This hook deliberately bypasses src/api.js and calls fetch directly (it is
// the one piece of the public, unauthenticated landing page that talks to the
// backend), so it is mocked here at the fetch level rather than via @/api.
describe('useAppDownloadLinks', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to the APP_LINKS statics when the API call 404s', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 404 });

    const { result } = renderHook(() => useAppDownloadLinks());

    await waitFor(() => {
      expect(result.current.riderAndroid).toBe(APP_LINKS.android);
    });
    expect(result.current.riderIos).toBe(APP_LINKS.ios);
    expect(result.current.driverAndroid).toBeNull();
  });

  it('falls back to the APP_LINKS statics when the fetch itself throws', async () => {
    global.fetch.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useAppDownloadLinks());

    await waitFor(() => {
      expect(result.current.riderAndroid).toBe(APP_LINKS.android);
    });
    expect(result.current.driverAndroid).toBeNull();
  });

  it('picks up real downloadUrl values when the API returns a release', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('app=rider')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ release: { downloadUrl: '/downloads/rider-app-1.0.0.apk' } }),
        });
      }
      if (url.includes('app=driver')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ release: { downloadUrl: '/downloads/driver-app-1.0.0.apk' } }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    const { result } = renderHook(() => useAppDownloadLinks());

    await waitFor(() => {
      expect(result.current.riderAndroid).toBe('/downloads/rider-app-1.0.0.apk');
    });
    expect(result.current.driverAndroid).toBe('/downloads/driver-app-1.0.0.apk');
  });

  it('keeps driverAndroid null when the API returns no release for it', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('app=rider')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ release: { downloadUrl: '/downloads/rider-app-1.0.0.apk' } }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ release: null }) });
    });

    const { result } = renderHook(() => useAppDownloadLinks());

    await waitFor(() => {
      expect(result.current.riderAndroid).toBe('/downloads/rider-app-1.0.0.apk');
    });
    expect(result.current.driverAndroid).toBeNull();
  });
});
