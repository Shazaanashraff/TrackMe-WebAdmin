import { clearStoredAuth, readStoredAuth, writeStoredAuth, isJwtExpired } from './lib/authSession';
import { getApiBaseUrl } from './lib/apiMode';

// Endpoints that either issue tokens themselves or are reachable without one —
// a refresh attempt here would be pointless or recursive.
const REFRESH_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/refresh-token',
  '/api/auth/logout',
  '/api/auth/forgot-password/request-otp',
  '/api/auth/forgot-password/verify-otp',
  '/api/auth/forgot-password/reset'
];

const handleUnauthorized = (message) => {
  const normalized = String(message || '').toLowerCase();
  const isAuthError = normalized.includes('not authorized') || normalized.includes('token failed');

  if (!isAuthError) return;

  clearStoredAuth();

  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login?reason=session_expired');
  }
};

const safeParseJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const refreshStoredAuth = async () => {
  const storedAuth = readStoredAuth();
  if (!storedAuth?.refreshToken) return null;

  const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken: storedAuth.refreshToken })
  });

  const data = await safeParseJson(response);

  if (!response.ok) {
    throw new Error(data.message || 'Session refresh failed');
  }

  return writeStoredAuth({
    ...storedAuth,
    ...data,
    token: data?.token || data?.accessToken || null,
    accessToken: data?.accessToken || data?.token || null,
    refreshToken: data?.refreshToken || storedAuth.refreshToken
  }, storedAuth.rememberMe);
};

// Several queries can fire on mount and all hit a 401 around the same time on
// token expiry. Without this, each would independently POST its own
// refresh-token request — wasteful, and a real risk of a spurious logout if the
// backend ever rotates refresh tokens (single-use), since only the first of the
// concurrent calls would still hold a valid one.
let refreshPromise = null;

const getSharedRefresh = () => {
  if (!refreshPromise) {
    refreshPromise = refreshStoredAuth().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

const request = async (path, options = {}) => {
  let cachedAuth = readStoredAuth();
  let token = cachedAuth?.token || cachedAuth?.accessToken || null;

  // Proactively refresh an already-expired token before firing the request,
  // instead of only reacting to the 401 it would otherwise guarantee. Every
  // session used to eat at least one failed request + silent retry right at
  // the expiry boundary; for a non-idempotent request landing on that boundary,
  // that was a real risk of a failed submission the user had to notice and retry.
  if (
    token &&
    cachedAuth?.refreshToken &&
    options.retryAfterRefresh !== false &&
    !REFRESH_EXEMPT_PATHS.includes(path) &&
    isJwtExpired(token)
  ) {
    try {
      cachedAuth = await getSharedRefresh();
      token = cachedAuth?.token || cachedAuth?.accessToken || token;
    } catch {
      // Fall through with the stale token — the request below will get a real
      // 401 and go through the existing reactive refresh/handleUnauthorized path.
    }
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await safeParseJson(response);

  if (!response.ok) {
    const isAuthFailure = response.status === 401 || response.status === 403;
    // Only a 401 means the token itself is the problem — the backend uses 403 for
    // role/deactivation checks (see middleware/auth.js) that a fresh token can
    // never fix, so retrying those would just repeat the same rejection after a
    // wasted round trip.
    const isRetryableAuthFailure = response.status === 401;
    const shouldRetryAfterRefresh =
      isRetryableAuthFailure &&
      options.retryAfterRefresh !== false &&
      cachedAuth?.refreshToken &&
      !REFRESH_EXEMPT_PATHS.includes(path);

    if (shouldRetryAfterRefresh) {
      try {
        await getSharedRefresh();
        return request(path, { ...options, retryAfterRefresh: false });
      } catch {
        handleUnauthorized(data.message);
      }
    }

    if (isAuthFailure) {
      handleUnauthorized(data.message);
    }

    const fieldErrors = Array.isArray(data.errors)
      ? data.errors.map((item) => item.message || item.msg).filter(Boolean)
      : [];
    const error = new Error(fieldErrors.length ? fieldErrors.join('; ') : (data.message || 'Request failed'));
    // Every message the backend flagged, not just the first — callers that want
    // to render a list (instead of the joined summary above) can use this.
    error.fieldErrors = fieldErrors;
    // Callers need to tell "the server rejected this" apart from "the request
    // never got through" — a network failure must not be treated as a rejection.
    error.status = response.status;
    throw error;
  }

  return data;
};

export const adminApi = {
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }).then((response) => ({
      ...response,
      token: response?.token || response?.accessToken || null
    })),

  refreshToken: (refreshToken) =>
    request('/api/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      retryAfterRefresh: false
    }),

  requestPasswordResetOtp: (email) =>
    request('/api/auth/forgot-password/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
      retryAfterRefresh: false
    }),

  verifyPasswordResetOtp: (email, otp) =>
    request('/api/auth/forgot-password/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
      retryAfterRefresh: false
    }),

  resetPasswordWithToken: (email, resetToken, password) =>
    request('/api/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify({ email, resetToken, password }),
      retryAfterRefresh: false
    }),

  // Consumes the invite/reset link emailed to a manager (buildSetupLink on the
  // backend). Both are public — no auth token exists yet at this point.
  validateAccountSetup: (token) =>
    request('/api/auth/account-setup/validate', {
      method: 'POST',
      body: JSON.stringify({ token }),
      retryAfterRefresh: false
    }),

  completeAccountSetup: (token, password) =>
    request('/api/auth/account-setup/complete', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
      retryAfterRefresh: false
    }),

  getSuperAdminDashboard: () => request('/api/super-admin/dashboard'),

  getSystemRoutes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/routes${query ? `?${query}` : ''}`);
  },

  createSystemRoute: (payload) =>
    request('/api/routes', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getOperationsOverview: () => request('/api/super-admin/operations'),

  getOperationManagerDetail: (managerId) => request(`/api/super-admin/operations/${managerId}`),

  getManagers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/super-admin/managers${query ? `?${query}` : ''}`);
  },

  createManager: (payload) =>
    request('/api/super-admin/managers', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateManager: (managerId, payload) =>
    request(`/api/super-admin/managers/${managerId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  updateManagerStatus: (managerId, payload) =>
    request(`/api/super-admin/managers/${managerId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  deleteManager: (managerId) =>
    request(`/api/super-admin/managers/${managerId}`, {
      method: 'DELETE'
    }),

  resetManagerPassword: (managerId, payload) =>
    request(`/api/super-admin/managers/${managerId}/reset-password`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  assignVehiclesToManager: (managerId, vehicleIds) =>
    request(`/api/super-admin/managers/${managerId}/assign-vehicles`, {
      method: 'PATCH',
      body: JSON.stringify({ vehicleIds })
    }),

  getPendingVehicleRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/super-admin/vehicle-requests${query ? `?${query}` : ''}`);
  },

  reviewVehicleRequest: (requestId, payload) =>
    request(`/api/super-admin/vehicle-requests/${requestId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/super-admin/audit-logs${query ? `?${query}` : ''}`);
  },

  updateVehicle: (vehicleId, payload) =>
    request(`/api/vehicle/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  getManagerDashboard: () => request('/api/manager/dashboard'),

  getVehicleRoutes: () => request('/api/vehicle/routes'),

  getManagerVehicles: () => request('/api/manager/vehicles'),

  // Current position for every vehicle the authenticated manager owns. The
  // tracking page keeps this as a polling fallback while one selected vehicle
  // receives lower-latency updates over Socket.IO.
  getManagerFleetLive: () => request('/api/manager/vehicles/live'),

  getManagerVehicleById: (vehicleId) => request(`/api/manager/vehicles/${vehicleId}`),

  updateManagerVehicle: (vehicleId, payload) =>
    request(`/api/manager/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  // A manager's first vehicle is created outright. Every vehicle after that is
  // submitted as a request a super admin must approve — same endpoint, the
  // response shape tells you which happened (data.vehicle vs a pending request).
  createManagerVehicle: (payload) =>
    request('/api/manager/vehicle-accounts', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  requestDeleteVehicle: (vehicleId, payload) =>
    request(`/api/manager/vehicles/${vehicleId}/delete-request`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getManagerRequests: () => request('/api/manager/requests'),

  resetManagerVehicleAccountPassword: (vehicleId, payload) =>
    request(`/api/manager/vehicle-accounts/${vehicleId}/reset-password`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  // Public routes + this manager's own named (ACTIVE) private custom routes —
  // the correct source for any "assign a route to my vehicle" dropdown.
  getManagerAssignableRoutes: () => request('/api/manager/routes'),

  // The schools / universities / offices a driver can be attached to. Same list
  // the super admin assigns managers to.
  getManagerOrganizations: (serviceType) =>
    request(`/api/manager/organizations${serviceType ? `?serviceType=${serviceType}` : ''}`),

  createManagerOrganization: (payload) =>
    request('/api/manager/organizations', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getManagerDrivers: () => request('/api/manager/drivers'),

  createManagerDriver: (payload) =>
    request('/api/manager/drivers', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateManagerDriver: (driverId, payload) =>
    request(`/api/manager/drivers/${driverId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteManagerDriver: (driverId) =>
    request(`/api/manager/drivers/${driverId}`, {
      method: 'DELETE'
    }),

  resetManagerDriverPassword: (driverId, password) =>
    request(`/api/manager/drivers/${driverId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password })
    }),

  getDriverEnrollmentKey: (driverId) =>
    request(`/api/manager/drivers/${driverId}/enrollment-key`),

  rotateDriverEnrollmentKey: (driverId) =>
    request(`/api/manager/drivers/${driverId}/enrollment-key/rotate`, {
      method: 'POST'
    }),

  revertDriverEnrollmentKey: (driverId) =>
    request(`/api/manager/drivers/${driverId}/enrollment-key/revert`, {
      method: 'POST'
    }),

  // Passengers who redeemed a private driver's key wait here for a decision.
  getEnrollmentRequests: (status = 'PENDING') =>
    request(`/api/manager/enrollment-requests?status=${encodeURIComponent(status)}`),

  getEnrollmentRequestCount: () => request('/api/manager/enrollment-requests/count'),

  approveEnrollmentRequest: (id) =>
    request(`/api/manager/enrollment-requests/${id}/approve`, {
      method: 'POST'
    }),

  rejectEnrollmentRequest: (id) =>
    request(`/api/manager/enrollment-requests/${id}/reject`, {
      method: 'POST'
    }),

  getManagerEnrollmentSchema: () => request('/api/manager/organization/enrollment-schema'),
  updateManagerEnrollmentSchema: (fields) =>
    request('/api/manager/organization/enrollment-schema', { method: 'PUT', body: JSON.stringify({ fields }) }),
  getOrganizations: () => request('/api/super-admin/organizations'),
  getOrganizationEnrollmentSchema: (organizationId) =>
    request(`/api/super-admin/organizations/${organizationId}/enrollment-schema`),
  updateOrganizationEnrollmentSchema: (organizationId, fields) =>
    request(`/api/super-admin/organizations/${organizationId}/enrollment-schema`, {
      method: 'PUT',
      body: JSON.stringify({ fields })
    })
};
