// Backend values are upper-case enums. These turn them into the words a person
// would read, falling back to a sentence-cased version of the raw value so a
// new backend value never shows up as shouting snake_case.

export function sentenceCase(value) {
  const text = String(value ?? '').replace(/_/g, ' ').trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

const REQUEST_TYPES = {
  CREATE_VEHICLE_ACCOUNT: 'New vehicle',
  DELETE_VEHICLE: 'Remove vehicle',
};

export function requestTypeLabel(type) {
  return REQUEST_TYPES[type] || sentenceCase(type);
}

const AUDIT_ACTIONS = {
  DRIVER_PASSWORD_VIEWED: 'Viewed driver password',
  ROUTE_CREATED: 'Created route',
  ROUTE_DELETED: 'Deleted route',
  ROUTE_QR_UPDATED: 'Changed route QR attendance',
  ROUTE_STATUS_TOGGLED: 'Changed route status',
  ROUTE_UPDATED: 'Updated route',
  VEHICLE_ACCOUNT_PASSWORD_RESET: 'Reset vehicle account password',
  VEHICLE_CREATED: 'Created vehicle',
  VEHICLE_CREATE_REQUESTED: 'Requested a new vehicle',
  VEHICLE_DELETE_REQUESTED: 'Requested vehicle removal',
  VEHICLE_EDITED: 'Edited vehicle',
  VEHICLE_REQUEST_APPROVED: 'Approved vehicle request',
  VEHICLE_REQUEST_REJECTED: 'Rejected vehicle request',
};

export function auditActionLabel(action) {
  return AUDIT_ACTIONS[action] || sentenceCase(action);
}
