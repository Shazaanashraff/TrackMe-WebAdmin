import { describe, it, expect } from 'vitest';
import { sideForStep, stepFromProgress } from '../story';

describe('stepFromProgress', () => {
  it('splits progress into equal bands, one per step', () => {
    expect(stepFromProgress(0, 4)).toBe(0);
    expect(stepFromProgress(0.24, 4)).toBe(0);
    expect(stepFromProgress(0.25, 4)).toBe(1);
    expect(stepFromProgress(0.5, 4)).toBe(2);
    expect(stepFromProgress(0.75, 4)).toBe(3);
  });

  it('keeps the last step at full progress instead of overshooting', () => {
    expect(stepFromProgress(1, 4)).toBe(3);
  });

  it('clamps out-of-range progress', () => {
    expect(stepFromProgress(-3, 4)).toBe(0);
    expect(stepFromProgress(9, 4)).toBe(3);
  });

  it('returns 0 for a single-step story', () => {
    expect(stepFromProgress(0.8, 1)).toBe(0);
  });
});

describe('sideForStep', () => {
  it('alternates the device left, right, left, right', () => {
    expect([0, 1, 2, 3].map(sideForStep)).toEqual(['left', 'right', 'left', 'right']);
  });
});
