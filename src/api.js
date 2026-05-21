const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const handleUnauthorized = (message) => {
  const normalized = String(message || '').toLowerCase();
  const isAuthError = normalized.includes('not authorized') || normalized.includes('token failed');

  if (!isAuthError) return;

  localStorage.removeItem('admin-auth');

  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

const request = async (path, options = {}) => {
  const cachedAuth = localStorage.getItem('admin-auth');
  const token = cachedAuth ? (JSON.parse(cachedAuth)?.token || JSON.parse(cachedAuth)?.accessToken) : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(data.message);
    }

    const fieldErrors = Array.isArray(data.errors)
      ? data.errors.map((item) => item.message || item.msg).filter(Boolean)
      : [];
    throw new Error(fieldErrors[0] || data.message || 'Request failed');
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

  resetManagerPassword: (managerId, payload) =>
    request(`/api/super-admin/managers/${managerId}/reset-password`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  assignBusesToManager: (managerId, busIds) =>
    request(`/api/super-admin/managers/${managerId}/assign-buses`, {
      method: 'PATCH',
      body: JSON.stringify({ busIds })
    }),

  getPendingBusRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/super-admin/bus-requests${query ? `?${query}` : ''}`);
  },

  reviewBusRequest: (requestId, payload) =>
    request(`/api/super-admin/bus-requests/${requestId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/super-admin/audit-logs${query ? `?${query}` : ''}`);
  },

  updateBus: (busId, payload) =>
    request(`/api/bus/${busId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  getManagerDashboard: () => request('/api/manager/dashboard'),

  getBusRoutes: () => request('/api/bus/routes'),

  getManagerBuses: () => request('/api/manager/buses'),

  getManagerBusById: (busId) => request(`/api/manager/buses/${busId}`),

  updateManagerBus: (busId, payload) =>
    request(`/api/manager/buses/${busId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  createBusAccountRequest: (payload) =>
    request('/api/manager/bus-accounts', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  requestDeleteBus: (busId, payload) =>
    request(`/api/manager/buses/${busId}/delete-request`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getManagerRequests: () => request('/api/manager/requests'),

  resetManagerBusAccountPassword: (busId, payload) =>
    request(`/api/manager/bus-accounts/${busId}/reset-password`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  getManagerBusLocation: (busId, minutes = 15) =>
    request(`/api/manager/buses/${busId}/location?minutes=${minutes}`)
};
