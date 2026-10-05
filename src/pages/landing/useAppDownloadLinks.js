import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/lib/apiMode';
import { APP_LINKS } from './config';

// Deliberately bypasses `adminApi`/`request()` in `src/api.js` — this call is
// made from the public, signed-out landing page and the endpoint itself is
// public, so there is no auth concern. Routing it through the admin API
// surface would misattribute it as an authenticated admin action.
async function fetchLatestRelease({ app, platform }) {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/app-releases/latest?app=${app}&platform=${platform}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.release || null;
  } catch {
    return null;
  }
}

// Falls back to the static APP_LINKS placeholders (and therefore the
// existing "Coming soon" button state) until a real release exists for
// that app+platform — this never regresses the pre-existing behavior.
export function useAppDownloadLinks() {
  const [links, setLinks] = useState({ riderAndroid: APP_LINKS.android, riderIos: APP_LINKS.ios, driverAndroid: null });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [riderAndroid, driverAndroid] = await Promise.all([
        fetchLatestRelease({ app: 'rider', platform: 'android' }),
        fetchLatestRelease({ app: 'driver', platform: 'android' }),
      ]);
      if (cancelled) return;
      setLinks((prev) => ({
        ...prev,
        riderAndroid: riderAndroid?.downloadUrl || APP_LINKS.android,
        driverAndroid: driverAndroid?.downloadUrl || null,
      }));
    })();

    return () => { cancelled = true; };
  }, []);

  return links;
}
