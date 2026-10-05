import { getApiBaseUrl } from '@/lib/apiMode';
import { DRIVER_INTEREST_ENDPOINT } from './config';

// Public, signed-out form, so like useAppDownloadLinks this calls the API
// directly instead of going through the authenticated `adminApi` request().
// It is only ever wired up once DRIVER_INTEREST_ENDPOINT is set in config.js.
//
// Contract the backend must implement (nothing exists yet; agree it with the
// backend owner before setting the endpoint):
//   POST <endpoint>   body: { email: string, source: 'landing' }   -> 2xx on success
export async function submitDriverInterest(email, { endpoint = DRIVER_INTEREST_ENDPOINT, fetchImpl = fetch } = {}) {
  if (!endpoint) throw new Error('Driver interest endpoint is not configured');

  const response = await fetchImpl(`${getApiBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source: 'landing' }),
  });

  if (!response.ok) {
    throw new Error(`Driver interest request failed (${response.status})`);
  }
}
