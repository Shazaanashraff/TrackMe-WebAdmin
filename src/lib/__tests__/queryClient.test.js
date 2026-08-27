import { describe, it, expect } from 'vitest';
import { shouldDehydrateQuery, isLiveQueryKey, isCredentialQueryKey } from '../queryClient';
import { qk } from '../queryKeys';

// Walks every key factory in queryKeys.js and calls it with a placeholder
// argument (unused factories that take no args ignore it). This is the
// guardrail: it fails the moment a new query key looks live but isn't
// excluded from persistence, without anyone having to remember to update a
// hand-written list of keys.
function collectAllKeys(node, keys = []) {
  for (const value of Object.values(node)) {
    if (typeof value === 'function') {
      keys.push(value('placeholder', 'placeholder2'));
    } else if (value && typeof value === 'object') {
      collectAllKeys(value, keys);
    }
  }
  return keys;
}

describe('isLiveQueryKey', () => {
  it('flags the fleet live-tracking key', () => {
    expect(isLiveQueryKey(qk.vehicles.managerLive())).toBe(true);
  });

  it('does not flag reference-data keys', () => {
    expect(isLiveQueryKey(qk.managers.all())).toBe(false);
    expect(isLiveQueryKey(qk.drivers.list())).toBe(false);
    expect(isLiveQueryKey(qk.vehicles.manager())).toBe(false);
  });
});

describe('isCredentialQueryKey', () => {
  it('flags the driver enrollment-key query', () => {
    expect(isCredentialQueryKey(qk.drivers.enrollmentKey('driver-1'))).toBe(true);
  });

  it('does not flag ordinary driver keys', () => {
    expect(isCredentialQueryKey(qk.drivers.list())).toBe(false);
    expect(isCredentialQueryKey(qk.drivers.all())).toBe(false);
  });
});

describe('shouldDehydrateQuery — the persistence safety rail', () => {
  it('refuses to persist the live fleet-tracking key', () => {
    expect(
      shouldDehydrateQuery({ queryKey: qk.vehicles.managerLive(), state: { status: 'success' } })
    ).toBe(false);
  });

  it('refuses to persist the driver enrollment key — a credential stays in memory only', () => {
    expect(
      shouldDehydrateQuery({
        queryKey: qk.drivers.enrollmentKey('driver-1'),
        state: { status: 'success' },
      })
    ).toBe(false);
  });

  it('refuses to persist a failed query, live or not', () => {
    expect(
      shouldDehydrateQuery({ queryKey: qk.managers.all(), state: { status: 'error' } })
    ).toBe(false);
    expect(
      shouldDehydrateQuery({ queryKey: qk.managers.all(), state: { status: 'pending' } })
    ).toBe(false);
  });

  it('persists a successful reference-data query', () => {
    expect(
      shouldDehydrateQuery({ queryKey: qk.managers.all(), state: { status: 'success' } })
    ).toBe(true);
  });

  it('walks every key this app can produce: only live + credential keys are excluded, everything else persists', () => {
    const keys = collectAllKeys(qk);
    expect(keys.length).toBeGreaterThan(10); // sanity check the walk actually found keys

    const liveKeys = keys.filter(isLiveQueryKey);
    expect(liveKeys).toEqual([qk.vehicles.managerLive()]);

    const credentialKeys = keys.filter(isCredentialQueryKey);
    expect(credentialKeys).toEqual([qk.drivers.enrollmentKey('placeholder')]);

    for (const key of keys) {
      const decision = shouldDehydrateQuery({ queryKey: key, state: { status: 'success' } });
      if (isLiveQueryKey(key) || isCredentialQueryKey(key)) {
        expect(decision, `expected ${JSON.stringify(key)} to be excluded from persistence`).toBe(false);
      } else {
        expect(decision, `expected ${JSON.stringify(key)} to persist`).toBe(true);
      }
    }
  });
});
