import { describe, it, expect } from 'vitest';
import { auditActionLabel, requestTypeLabel, sentenceCase } from '../labels';

describe('labels', () => {
  it('turns snake_case enums into sentence case', () => {
    expect(sentenceCase('MANAGER_STATUS_CHANGED')).toBe('Manager status changed');
    expect(sentenceCase('')).toBe('');
    expect(sentenceCase(undefined)).toBe('');
  });

  it('names known request types and falls back for unknown ones', () => {
    expect(requestTypeLabel('CREATE_VEHICLE_ACCOUNT')).toBe('New vehicle');
    expect(requestTypeLabel('DELETE_VEHICLE')).toBe('Remove vehicle');
    expect(requestTypeLabel('SOMETHING_NEW')).toBe('Something new');
  });

  it('names known audit actions and falls back for unknown ones', () => {
    expect(auditActionLabel('DRIVER_PASSWORD_VIEWED')).toBe('Viewed driver password');
    expect(auditActionLabel('VEHICLE_CREATED')).toBe('Created vehicle');
    expect(auditActionLabel('MANAGER_DELETED')).toBe('Manager deleted');
  });
});
