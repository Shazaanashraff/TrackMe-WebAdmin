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
    assignableRoutes: () => ['routes', 'assignable'],
    managerRequests: () => ['manager-requests'],
  },
  organizations: {
    all: () => ['organizations'],
    byServiceType: (serviceType) => ['organizations', serviceType || 'all'],
  },
  drivers: {
    all: () => ['drivers'],
    list: () => ['drivers', 'list'],
    enrollmentKey: (driverId) => ['drivers', driverId, 'enrollment-key'],
  },
  enrollmentRequests: {
    all: () => ['enrollment-requests'],
    list: (status = 'PENDING') => ['enrollment-requests', 'list', status],
    count: () => ['enrollment-requests', 'count'],
  },
  enrollmentSchema: {
    manager: () => ['enrollment-schema', 'manager'],
    organization: (organizationId) => ['enrollment-schema', 'organization', organizationId],
  },
};
