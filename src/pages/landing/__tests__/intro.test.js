import { describe, it, expect, vi } from 'vitest';
import { INTRO_KEY, INTRO_MAX_MS, irisOrigin, markIntroSeen, padCount, readIntroSeen, shouldPlayIntro } from '../motion/intro';

describe('shouldPlayIntro', () => {
  it('plays for a first-time visitor in a browser that can animate', () => {
    expect(shouldPlayIntro({ canAnimate: true, reduced: false, seen: false })).toBe(true);
  });

  it('never plays for someone who prefers reduced motion', () => {
    expect(shouldPlayIntro({ canAnimate: true, reduced: true, seen: false })).toBe(false);
  });

  it('never plays again in the same session', () => {
    expect(shouldPlayIntro({ canAnimate: true, reduced: false, seen: true })).toBe(false);
  });

  it('never plays where animation is unavailable', () => {
    expect(shouldPlayIntro({ canAnimate: false, reduced: false, seen: false })).toBe(false);
  });
});

describe('readIntroSeen / markIntroSeen', () => {
  const memoryStorage = () => {
    const data = {};
    return {
      getItem: (k) => (k in data ? data[k] : null),
      setItem: (k, v) => { data[k] = String(v); },
    };
  };

  it('starts unseen, and remembers once marked', () => {
    const storage = memoryStorage();
    expect(readIntroSeen(storage)).toBe(false);
    markIntroSeen(storage);
    expect(storage.getItem(INTRO_KEY)).toBe('1');
    expect(readIntroSeen(storage)).toBe(true);
  });

  it('treats blocked storage as unseen instead of crashing', () => {
    const blocked = {
      getItem: vi.fn(() => { throw new Error('SecurityError'); }),
      setItem: vi.fn(() => { throw new Error('SecurityError'); }),
    };
    expect(readIntroSeen(blocked)).toBe(false);
    expect(() => markIntroSeen(blocked)).not.toThrow();
  });

  it('copes with no storage at all', () => {
    expect(readIntroSeen(null)).toBe(false);
    expect(() => markIntroSeen(null)).not.toThrow();
  });
});

describe('padCount', () => {
  it('shows three digits', () => {
    expect(padCount(0)).toBe('000');
    expect(padCount(7)).toBe('007');
    expect(padCount(42.4)).toBe('042');
    expect(padCount(100)).toBe('100');
  });

  it('never leaves the 0 to 100 range, and never prints NaN', () => {
    expect(padCount(-20)).toBe('000');
    expect(padCount(250)).toBe('100');
    expect(padCount(undefined)).toBe('000');
    expect(padCount('abc')).toBe('000');
  });
});

describe('irisOrigin', () => {
  it('opens towards the shuttle on a wide screen (right of centre)', () => {
    const o = irisOrigin(1440, 900);
    expect(o.x).toBeGreaterThan(50);
  });

  it('opens from the upper middle on a phone, where the shuttle sits above the headline', () => {
    expect(irisOrigin(390, 844)).toEqual({ x: 50, y: 40 });
  });
});

describe('INTRO_MAX_MS', () => {
  it('is a real ceiling: long enough to play, short enough to never feel stuck', () => {
    expect(INTRO_MAX_MS).toBeGreaterThanOrEqual(2500);
    expect(INTRO_MAX_MS).toBeLessThanOrEqual(5000);
  });
});
