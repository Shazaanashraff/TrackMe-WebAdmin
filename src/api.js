import { clearStoredAuth, readStoredAuth, writeStoredAuth } from './lib/authSession';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const handleUnauthorized = (message) => {
  const normalized = String(message || '').toLowerCase();
  const isAuthError = normalized.includes('not authorized') || normalized.includes('token failed');

  if (!isAuthError) return;

  clearStoredAuth();

  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
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

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
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

const request = async (path, options = {}) => {
  const cachedAuth = readStoredAuth();
  const token = cachedAuth?.token || cachedAuth?.accessToken || null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
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
    const shouldRetryAfterRefresh =
      isAuthFailure &&
      options.retryAfterRefresh !== false &&
      cachedAuth?.refreshToken &&
      ![
        '/api/auth/login',
        '/api/auth/refresh-token',
        '/api/auth/logout',
        '/api/auth/forgot-password/request-otp',
        '/api/auth/forgot-password/verify-otp',
        '/api/auth/forgot-password/reset'
      ].includes(path);

    if (shouldRetryAfterRefresh) {
      try {
        await refreshStoredAuth();
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
    const error = new Error(fieldErrors[0] || data.message || 'Request failed');
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

  getManagerVehicleById: (vehicleId) => request(`/api/manager/vehicles/${vehicleId}`),

  updateManagerVehicle: (vehicleId, payload) =>
    request(`/api/manager/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  createVehicleAccountRequest: (payload) =>
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

  getManagerCustomRoutes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/manager/custom-routes${query ? `?${query}` : ''}`);
  },

  nameCustomRoute: (routeId, payload) =>
    request(`/api/manager/custom-routes/${routeId}/name`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
};
