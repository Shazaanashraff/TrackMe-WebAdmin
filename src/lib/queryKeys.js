/**
 * Central query-key factory. Every hook derives its keys from here so that
 * mutations can invalidate precisely and no page hardcodes a key string.
 */
export const qk = {
  dashboard: {
    superAdmin: () => ['dashboard', 'super-admin'],
    manager: () => ['dashboard', 'manager'],
  },
  operations: {
    overview: () => ['operations', 'overview'],
    managerDetail: (managerId) => ['operations', 'manager', managerId],
    audit: (params = {}) => ['operations', 'audit', params],
  },
  managers: {
    all: () => ['managers'],
    list: (params = {}) => ['managers', params],
  },
  vehicleRequests: {
    all: () => ['vehicle-requests'],
    pending: (params = {}) => ['vehicle-requests', 'pending', params],
  },
  systemRoutes: {
    all: () => ['system-routes'],
    list: (params = {}) => ['system-routes', params],
  },
  vehicles: {
    all: () => ['vehicles'],
    manager: () => ['vehicles', 'manager'],
    byId: (vehicleId) => ['vehicles', vehicleId],
    location: (vehicleId, minutes) => ['vehicles', vehicleId, 'location', minutes],
    assignableRoutes: () => ['routes', 'assignable'],
    managerRequests: () => ['manager-requests'],
  },
  routeApprovals: {
    customRoutes: (params = {}) => ['custom-routes', params],
    changeRequests: (params = {}) => ['route-change-requests', params],
  },
  privateRoutes: {
    owned: () => ['owned-routes'],
    joinRequests: (routeId, params = {}) => ['route', routeId, 'join-requests', params],
    members: (routeId, params = {}) => ['route', routeId, 'members', params],
  },
};
