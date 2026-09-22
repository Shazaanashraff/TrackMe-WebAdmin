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

export const SUPER_ADMIN_AUTH = {
  token: 'e2e-fake-super-admin-token',
  accessToken: 'e2e-fake-super-admin-token',
  user: { _id: 'sa-1', name: 'E2E Admin', email: 'admin@trackme.com', role: 'super-admin' },
  rememberMe: true,
};

/** Same idea as loginAsManager, seeded with a super-admin session instead. */
export async function loginAsSuperAdmin(page: Page) {
  await page.addInitScript((auth) => {
    window.localStorage.setItem('admin-auth', JSON.stringify(auth));
  }, SUPER_ADMIN_AUTH);
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
    updateProfileResponse?: { status?: number; body: unknown };
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

  await page.route('**/api/auth/profile', async (route) => {
    if (opts.updateProfileResponse) {
      const { status = 200, body } = opts.updateProfileResponse;
      route.fulfill(json(body, status));
      return;
    }
    const requestBody = route.request().postDataJSON() as { name?: string };
    route.fulfill(json({ success: true, data: { name: requestBody?.name } }));
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

export interface MockSystemRoute {
  routeId: string;
  routeName: string;
  source: string;
  destination: string;
  distance: number;
  fare: number;
  serviceType: string;
  province?: string;
  qrEnabled?: boolean;
  isActive?: boolean;
}

/**
 * Mocks the endpoints RoutesPage (super-admin) touches: GET/PUT/PATCH/DELETE
 * /api/routes(/:routeId[/toggle]) with in-memory state, plus the manager list
 * it fetches for the province-manager sidebar. No live backend/DB needed.
 */
export async function mockSuperAdminRoutesBackend(
  page: Page,
  opts: { routes?: MockSystemRoute[]; managers?: unknown[] } = {}
) {
  const routes: MockSystemRoute[] = opts.routes ? [...opts.routes] : [];
  const managers = opts.managers ?? [];

  await page.route('**/api/super-admin/managers*', (route) =>
    route.fulfill(json({ success: true, data: managers }))
  );

  await page.route('**/api/routes', (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as MockSystemRoute;
      const created = { ...body, isActive: true };
      routes.push(created);
      route.fulfill(json({ success: true, data: created }, 201));
      return;
    }
    route.fulfill(json({ success: true, data: routes }));
  });

  await page.route(/\/api\/routes\/([^/]+)\/toggle$/, (route) => {
    const routeId = decodeURIComponent(route.request().url().match(/\/api\/routes\/([^/]+)\/toggle$/)?.[1] ?? '');
    const target = routes.find((r) => r.routeId === routeId);
    if (target) target.isActive = target.isActive === false;
    route.fulfill(json({ success: true, data: target }));
  });

  await page.route(/\/api\/routes\/([^/]+)$/, (route) => {
    const routeId = decodeURIComponent(route.request().url().match(/\/api\/routes\/([^/]+)$/)?.[1] ?? '');
    const target = routes.find((r) => r.routeId === routeId);
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as Partial<MockSystemRoute>;
      if (target) Object.assign(target, body);
      route.fulfill(json({ success: true, data: target }));
      return;
    }
    if (route.request().method() === 'DELETE') {
      const idx = routes.findIndex((r) => r.routeId === routeId);
      if (idx !== -1) routes.splice(idx, 1);
      route.fulfill(json({ success: true, message: 'Route deleted successfully' }));
      return;
    }
    route.fulfill(json({ success: true, data: target }));
  });

  return { routes };
}

export interface MockManager {
  _id: string;
  name: string;
  email: string;
  isActive?: boolean;
}

/**
 * Mocks the super-admin managers endpoint (GET list / POST create) that
 * ManagersPage touches, with in-memory state so a created manager shows up
 * in the directory immediately — no live backend/DB needed.
 */
export async function mockSuperAdminManagersBackend(page: Page, opts: { managers?: MockManager[] } = {}) {
  const managers: MockManager[] = opts.managers ? [...opts.managers] : [];

  await page.route('**/api/super-admin/managers', (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name: string; email: string; password: string };
      const created: MockManager = {
        _id: `mgr-${managers.length + 1}`,
        name: body.name,
        email: body.email,
        isActive: true,
      };
      managers.push(created);
      route.fulfill(json({ success: true, data: created, message: 'Manager created' }, 201));
      return;
    }
    route.fulfill(json({ success: true, data: managers }));
  });

  return { managers };
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

export interface MockManagerVehicle {
  vehicleId: string;
  vehicleName?: string;
  numberPlate: string;
  routeId?: string | null;
  vehicleType?: string;
  serviceType?: string;
  isActive?: boolean;
  driverId?: { name: string } | null;
  organization?: { name: string } | null;
}

/**
 * Mocks every backend endpoint the manager shell touches, with in-memory
 * state for custom routes (so naming a route makes it show up as ACTIVE and
 * in the assignable-routes dropdown) and for vehicles (so creating one shows
 * up in the fleet table) — without needing a live backend/DB.
 */
/**
 * Mocks the endpoints `AppShell` fires on EVERY manager page, independent of
 * which page is open — right now the sidebar's pending-enrollment badge.
 *
 * Any manager spec must register these. `src/api.js:24` sends the browser to
 * `/login?reason=session_expired` on a 401, so a single unmocked manager
 * endpoint tears down the session mid-test and the failure surfaces as an
 * unrelated "element not found" wherever the spec happened to be looking.
 *
 * Called by `mockManagerBackend`, so page-level specs get it for free. Specs
 * that only need the shell (e.g. settings) can call this on its own.
 */
export async function mockManagerShellBackend(page: Page) {
  await page.route('**/api/manager/enrollment-requests/count', (route) =>
    route.fulfill(json({ success: true, data: { count: 0 } })));
}

export async function mockManagerBackend(
  page: Page,
  opts: {
    customRoutes?: MockRoute[];
    changeRequests?: MockChangeRequest[];
    vehicles?: MockManagerVehicle[];
  } = {}
) {
  await mockManagerShellBackend(page);

  const publicRoutes: MockRoute[] = [
    { routeId: 'PUB-1', routeName: 'Public Route 1', visibility: 'PUBLIC' },
  ];
  const customRoutes: MockRoute[] = opts.customRoutes ? [...opts.customRoutes] : [];
  const changeRequests: MockChangeRequest[] = opts.changeRequests ? [...opts.changeRequests] : [];
  const vehicles: MockManagerVehicle[] = opts.vehicles ? [...opts.vehicles] : [];
  const createRequests: unknown[] = [];
  // Every body POSTed to /api/manager/vehicle-accounts, so a spec can assert
  // what the create wizard actually submitted (e.g. routeMode: 'CUSTOM').
  const vehicleRequests: unknown[] = [];

  await page.route('**/api/manager/dashboard', (route) => route.fulfill(json({ success: true, data: {} })));
  await page.route('**/api/manager/buses', (route) => route.fulfill(json({ success: true, data: [] })));
  await page.route('**/api/manager/requests', (route) => route.fulfill(json({ success: true, data: [] })));

  // GET /api/manager/vehicles — the fleet table on ManagerVehiclesPage.
  await page.route('**/api/manager/vehicles', (route) => {
    route.fulfill(json({ success: true, data: vehicles }));
  });

  // POST /api/manager/vehicle-accounts — a manager's first vehicle is created
  // outright; every one after that would be submitted for super-admin
  // approval instead (mirrors the backend's real branching, see src/api.js).
  await page.route('**/api/manager/vehicle-accounts', async (route) => {
    const body = route.request().postDataJSON() as Partial<MockManagerVehicle> & { driverName?: string };
    vehicleRequests.push(body);
    const created: MockManagerVehicle = {
      vehicleId: body.vehicleId as string,
      vehicleName: body.vehicleName || body.numberPlate,
      numberPlate: body.numberPlate as string,
      routeId: body.routeId || null,
      vehicleType: body.vehicleType,
      serviceType: body.serviceType,
      isActive: true,
      driverId: body.driverName ? { name: body.driverName } : null,
      organization: null,
    };
    if (vehicles.length === 0) {
      vehicles.push(created);
      route.fulfill(json({ success: true, data: { vehicle: created } }, 201));
      return;
    }
    route.fulfill(json({ success: true, data: { requestId: `veh-req-${vehicles.length + 1}` } }, 201));
  });

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

  return { createRequests, vehicleRequests, customRoutes, changeRequests, vehicles };
}

/**
 * Populates every manager surface with enough data to actually render its
 * lists, on top of `mockManagerBackend`'s route table.
 *
 * `mockManagerBackend` deliberately returns an empty dashboard, no drivers and
 * no enrollment requests, which is right for the flow specs but means a
 * layout test would only ever see empty states. Register this afterwards so
 * its handlers take precedence, and the responsive spec exercises the real
 * card lists and stat values.
 *
 * Values are chosen to be the awkward cases: money wide enough to overflow a
 * narrow stat card, a long organization name, a full-length enrollment key.
 */
export async function mockManagerPortalData(page: Page) {
  const drivers = [
    {
      _id: 'drv-1',
      name: 'Anushka Wickramasinghe',
      driverCode: 'TMD-4821',
      email: 'anushka.wickramasinghe@example.com',
      phoneNumber: '0771234567',
      isActive: true,
      setupComplete: true,
      organization: { _id: 'org-1', name: 'Royal Institute of Technology', serviceType: 'UNIVERSITY' },
      vehicle: { vehicleId: 'VEH-001', numberPlate: 'NB-1234' },
      riders: { active: 12, pending: 3 },
    },
    {
      _id: 'drv-2',
      name: 'Kamal Perera',
      driverCode: 'TMD-4822',
      email: null,
      phoneNumber: null,
      isActive: true,
      setupComplete: false,
      organization: null,
      vehicle: null,
      riders: { active: 0, pending: 0 },
    },
    {
      _id: 'drv-3',
      name: 'Nimali Fernando',
      driverCode: 'TMD-4823',
      email: 'nimali@example.com',
      phoneNumber: '0719876543',
      isActive: false,
      setupComplete: true,
      organization: { _id: 'org-1', name: 'Royal Institute of Technology', serviceType: 'UNIVERSITY' },
      vehicle: { vehicleId: 'VEH-002', numberPlate: 'NC-5678' },
      riders: { active: 4, pending: 0 },
    },
  ];

  const enrollmentRequests = [
    {
      _id: 'enr-1',
      requestedAt: '2026-09-20T04:30:00.000Z',
      decidedAt: null,
      passenger: {
        _id: 'psg-1',
        name: 'Sanduni Jayawardena',
        riderCode: 'TMR-WYFE-QFDE',
        email: 'sanduni.jayawardena@example.com',
        isManagedProfile: false,
        account: { email: 'sanduni.jayawardena@example.com', phoneNumber: '0761112233' },
        organizationValues: { studentId: 'IT21234567', department: 'Computing', year: '3' },
      },
      driver: { _id: 'drv-1', name: 'Anushka Wickramasinghe', driverCode: 'TMD-4821' },
    },
    {
      _id: 'enr-2',
      requestedAt: '2026-09-21T02:15:00.000Z',
      decidedAt: null,
      passenger: {
        _id: 'psg-2',
        name: 'Ruwan Silva',
        riderCode: 'TMR-KH6L-Y9TP',
        isManagedProfile: true,
        relation: 'Son',
        account: { email: 'parent.silva@example.com', phoneNumber: '0704445566' },
        organizationValues: { studentId: 'IT21998877', department: 'Engineering', year: '1' },
      },
      driver: { _id: 'drv-3', name: 'Nimali Fernando', driverCode: 'TMD-4823' },
    },
  ];

  await page.route('**/api/manager/dashboard', (route) => route.fulfill(json({
    success: true,
    data: {
      fleet: { totalVehicles: 8, activeVehicles: 6 },
      bookings: { totalRevenue: 1284500.5, confirmedBookings: 214, cancelledBookings: 9 },
      pendingRequests: 2,
    },
  })));

  await page.route('**/api/manager/drivers', (route) => route.fulfill(json({ success: true, data: drivers })));

  await page.route('**/api/manager/vehicles', (route) => route.fulfill(json({
    success: true,
    data: [
      {
        _id: 'veh-1',
        vehicleId: 'VEH-001',
        vehicleName: 'Morning Shuttle A',
        numberPlate: 'NB-1234',
        routeId: 'PUB-1',
        routeName: 'Malabe to Colombo Fort',
        vehicleType: 'AC',
        serviceType: 'UNIVERSITY',
        isActive: true,
        driverId: { name: 'Anushka Wickramasinghe' },
        organization: { name: 'Royal Institute of Technology' },
      },
      {
        _id: 'veh-2',
        vehicleId: 'VEH-002',
        vehicleName: 'Evening Shuttle B',
        numberPlate: 'NC-5678',
        routeId: null,
        vehicleType: 'NON-AC',
        serviceType: 'PUBLIC',
        isActive: false,
        driverId: null,
        organization: null,
      },
    ],
  })));

  await page.route(/\/api\/manager\/drivers\/[^/]+\/enrollment-key$/, (route) => route.fulfill(json({
    success: true,
    data: { enrollmentKey: 'TMD-AAAA-BBBB-CCCC', canRevert: false },
  })));

  await page.route('**/api/manager/vehicles/live', (route) => route.fulfill(json({
    success: true,
    data: [{
      vehicleId: 'VEH-001',
      driver: { _id: 'drv-1', name: 'Anushka Wickramasinghe' },
      vehicle: { vehicleId: 'VEH-001', numberPlate: 'NB-1234', routeId: 'PUB-1' },
      location: { latitude: 6.9271, longitude: 79.8612, speed: 32.5, heading: 145, updatedAt: new Date().toISOString() },
      updatedAt: new Date().toISOString(),
    }],
  })));

  await page.route(/\/api\/manager\/enrollment-requests\?status=/, (route) => {
    const status = new URL(route.request().url()).searchParams.get('status');
    const data = status === 'PENDING' ? enrollmentRequests : [];
    route.fulfill(json({ success: true, data }));
  });

  await page.route('**/api/manager/enrollment-requests/count', (route) =>
    route.fulfill(json({ success: true, data: { count: enrollmentRequests.length } })));

  await page.route('**/api/manager/organization/enrollment-schema', (route) => route.fulfill(json({
    success: true,
    data: {
      organization: { _id: 'org-1', name: 'Royal Institute of Technology', serviceType: 'UNIVERSITY' },
      schemaVersion: 3,
      fields: [
        { key: 'studentId', label: 'Student / employee ID', enabled: true, required: true },
        { key: 'department', label: 'Department or faculty', enabled: true, required: false },
        { key: 'year', label: 'Year of study', enabled: false, required: false },
      ],
    },
  })));

  await page.route('**/api/manager/organizations*', (route) => route.fulfill(json({
    success: true,
    data: [{ _id: 'org-1', name: 'Royal Institute of Technology', serviceType: 'UNIVERSITY' }],
  })));

  return { drivers, enrollmentRequests };
}

/**
 * Fails the test loudly on the FIRST unmocked `/api/` request instead of
 * letting it reach a real backend.
 *
 * This exists because of how the settings, custom-routes and cross-role specs
 * broke: `AppShell` gained a pending-enrollment badge query, no spec mocked
 * the new endpoint, and `src/api.js:24` turns any 401 into
 * `window.location.assign('/login?reason=session_expired')`. The session was
 * torn down mid-test and the failure surfaced as "element not found" at
 * whatever line the spec had reached, pointing nowhere near the cause. Three
 * specs failed that way and stayed failing.
 *
 * Register it LAST, after every other mock, so it only catches what nothing
 * else claimed. Opt-in: an existing spec that deliberately lets a call through
 * should not start failing because this was added.
 */
export async function failOnUnmockedApi(page: Page) {
  await page.route('**/api/**', (route) => {
    const request = route.request();
    throw new Error(
      `Unmocked API call: ${request.method()} ${request.url()}\n`
      + 'Add it to the spec\'s mocks. Left unmocked it reaches a real backend, and a '
      + '401 there sends the app to /login?reason=session_expired, which will surface '
      + 'as an unrelated "element not found" later in the test.'
    );
  });
}
