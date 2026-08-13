import { Page } from '@playwright/test';

export const MANAGER_AUTH = {
  token: 'e2e-fake-manager-token',
  accessToken: 'e2e-fake-manager-token',
  user: { _id: 'mgr-1', name: 'E2E Manager', email: 'manager@example.com', role: 'admin' },
  rememberMe: true,
};

/**
 * Seed the browser's localStorage with a logged-in manager session so tests
 * can start directly in the manager shell without exercising the real login
 * flow. Deliberately omits refreshToken so App.jsx's hydration effect skips
 * its refresh-token network call.
 */
export async function loginAsManager(page: Page) {
  await page.addInitScript((auth) => {
    window.localStorage.setItem('admin-auth', JSON.stringify(auth));
  }, MANAGER_AUTH);
}

const json = (data: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(data),
});

/**
 * Mocks the auth endpoints (/api/auth/*) so login, session refresh, and the
 * forgot-password journey can be driven through the REAL UI end to end
 * without a live backend. Pass overrides to script a specific outcome (e.g. a
 * failed login, an expired OTP) for a given test.
 */
export async function mockAuthBackend(
  page: Page,
  opts: {
    loginResponse?: { status?: number; body: unknown };
    refreshResponse?: { status?: number; body: unknown };
    requestOtpResponse?: { status?: number; body: unknown };
    verifyOtpResponse?: { status?: number; body: unknown };
    resetPasswordResponse?: { status?: number; body: unknown };
  } = {}
) {
  await page.route('**/api/auth/login', (route) => {
    const { status = 200, body = { success: true } } = opts.loginResponse ?? {};
    route.fulfill(json(body, status));
  });

  await page.route('**/api/auth/refresh-token', (route) => {
    const { status = 200, body = { success: true } } = opts.refreshResponse ?? {};
    route.fulfill(json(body, status));
  });

  await page.route('**/api/auth/forgot-password/request-otp', (route) => {
    const { status = 200, body = { success: true } } = opts.requestOtpResponse ?? {};
    route.fulfill(json(body, status));
  });

  await page.route('**/api/auth/forgot-password/verify-otp', (route) => {
    const { status = 200, body = { success: true, resetToken: 'e2e-reset-token' } } = opts.verifyOtpResponse ?? {};
    route.fulfill(json(body, status));
  });

  await page.route('**/api/auth/forgot-password/reset', (route) => {
    const { status = 200, body = { success: true } } = opts.resetPasswordResponse ?? {};
    route.fulfill(json(body, status));
  });
}

/** Mocks the handful of endpoints the super-admin Dashboard page fetches on load. */
export async function mockSuperAdminDashboardBackend(page: Page) {
  await page.route('**/api/super-admin/dashboard', (route) =>
    route.fulfill(
      json({
        success: true,
        data: {
          managers: { totalManagers: 1 },
          vehicles: { activeVehicles: 0, inactiveVehicles: 0 },
          bookings: { confirmedBookings: 0 },
          reviews: { averageRating: 0 },
        },
      })
    )
  );
  await page.route('**/api/super-admin/operations', (route) => route.fulfill(json({ success: true, data: [] })));
  await page.route('**/api/super-admin/vehicle-requests*', (route) =>
    route.fulfill(json({ success: true, data: [] }))
  );
}

export interface MockRoute {
  routeId: string;
  routeName?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  status?: 'ACTIVE' | 'PENDING_NAMING';
  origin?: 'SYSTEM' | 'RECORDED';
  distance?: number;
  stopsCount?: number;
  pathPolyline?: string;
  stops?: Array<{ lat: number; lng: number; stopName?: string }>;
  recordedMeta?: { snapped?: boolean };
}

export interface MockChangeRequest {
  _id: string;
  currentRouteId: { routeId: string; routeName: string; pathPolyline: string; stops: unknown[]; distance: number };
  candidate: { pathPolyline: string; stops: unknown[]; distance: number; snapped: boolean };
  deviation: { maxMeters: number; fractionOff: number; sampleCount: number };
  status: 'PENDING' | 'RESOLVED';
  resolution?: 'KEEP_OLD' | 'ADOPT_NEW' | null;
}

/**
 * Mocks every backend endpoint the manager shell touches, with in-memory
 * state for custom routes so naming a route makes it show up as ACTIVE and
 * in the assignable-routes dropdown — without needing a live backend/DB.
 */
export async function mockManagerBackend(
  page: Page,
  opts: { customRoutes?: MockRoute[]; changeRequests?: MockChangeRequest[] } = {}
) {
  const publicRoutes: MockRoute[] = [
    { routeId: 'PUB-1', routeName: 'Public Route 1', visibility: 'PUBLIC' },
  ];
  const customRoutes: MockRoute[] = opts.customRoutes ? [...opts.customRoutes] : [];
  const changeRequests: MockChangeRequest[] = opts.changeRequests ? [...opts.changeRequests] : [];
  const createRequests: unknown[] = [];

  await page.route('**/api/manager/dashboard', (route) => route.fulfill(json({ success: true, data: {} })));
  await page.route('**/api/manager/buses', (route) => route.fulfill(json({ success: true, data: [] })));
  await page.route('**/api/manager/requests', (route) => route.fulfill(json({ success: true, data: [] })));

  await page.route('**/api/manager/routes', (route) => {
    const active = customRoutes.filter((r) => r.status === 'ACTIVE');
    route.fulfill(json({ success: true, data: [...publicRoutes, ...active] }));
  });

  await page.route('**/api/manager/custom-routes?status=PENDING_NAMING', (route) => {
    route.fulfill(json({ success: true, data: customRoutes.filter((r) => r.status !== 'ACTIVE') }));
  });

  await page.route(/\/api\/manager\/custom-routes\/[^/]+\/name$/, async (route) => {
    const body = route.request().postDataJSON() as { routeName: string };
    const routeIdMatch = route.request().url().match(/custom-routes\/([^/]+)\/name/);
    const routeId = routeIdMatch?.[1];
    const target = customRoutes.find((r) => r.routeId === routeId);
    if (target) {
      target.status = 'ACTIVE';
      target.routeName = body.routeName;
    }
    route.fulfill(json({ success: true, data: target }));
  });

  await page.route('**/api/manager/route-change-requests?status=PENDING', (route) => {
    route.fulfill(json({ success: true, data: changeRequests.filter((cr) => cr.status === 'PENDING') }));
  });

  await page.route(/\/api\/manager\/route-change-requests\/[^/]+\/resolve$/, async (route) => {
    const body = route.request().postDataJSON() as { resolution: 'KEEP_OLD' | 'ADOPT_NEW' };
    const idMatch = route.request().url().match(/route-change-requests\/([^/]+)\/resolve/);
    const id = idMatch?.[1];
    const target = changeRequests.find((cr) => cr._id === id);
    if (target) {
      target.status = 'RESOLVED';
      target.resolution = body.resolution;
      if (body.resolution === 'ADOPT_NEW') {
        const route2 = customRoutes.find((r) => r.routeId === target.currentRouteId.routeId);
        if (route2) {
          route2.pathPolyline = target.candidate.pathPolyline;
          route2.distance = target.candidate.distance;
        }
      }
    }
    route.fulfill(json({ success: true, data: target }));
  });

  await page.route('**/api/manager/bus-accounts', async (route) => {
    createRequests.push(route.request().postDataJSON());
    route.fulfill(json({ success: true, data: { _id: 'req-1' } }, 201));
  });

  // Leaflet tile requests — avoid a real network dependency in the map preview.
  await page.route('https://*.tile.openstreetmap.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from([]) })
  );

  return { createRequests, customRoutes, changeRequests };
}
