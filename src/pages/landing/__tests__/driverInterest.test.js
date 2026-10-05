import { describe, it, expect, vi } from 'vitest';
import { submitDriverInterest } from '../driverInterest';

const okResponse = { ok: true, status: 201 };

describe('submitDriverInterest', () => {
  it('refuses to run while no endpoint is configured, so it can never pretend to send', async () => {
    const fetchImpl = vi.fn();
    await expect(submitDriverInterest('a@b.co', { endpoint: null, fetchImpl })).rejects.toThrow(/not configured/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('POSTs the email and the landing source as JSON to the configured endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse);
    await submitDriverInterest('driver@example.com', { endpoint: '/api/leads/driver', fetchImpl });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toMatch(/\/api\/leads\/driver$/);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ email: 'driver@example.com', source: 'landing' });
  });

  it('throws on a non-2xx response so the form shows its failure message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(
      submitDriverInterest('driver@example.com', { endpoint: '/api/leads/driver', fetchImpl }),
    ).rejects.toThrow(/500/);
  });

  it('propagates a network failure instead of swallowing it', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      submitDriverInterest('driver@example.com', { endpoint: '/api/leads/driver', fetchImpl }),
    ).rejects.toThrow(/failed to fetch/i);
  });
});
