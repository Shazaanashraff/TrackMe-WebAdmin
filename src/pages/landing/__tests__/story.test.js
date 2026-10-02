import { describe, it, expect } from 'vitest';
import { sectionProgress, sideForStep, stepFromProgress } from '../story';

describe('sectionProgress', () => {
  it('is 0 while the section top is still at or below the viewport top', () => {
    expect(sectionProgress(0, 3600, 900)).toBe(0);
    expect(sectionProgress(400, 3600, 900)).toBe(0);
  });

  it('is 1 once the sticky stage has used all of its travel', () => {
    expect(sectionProgress(-2700, 3600, 900)).toBe(1);
    expect(sectionProgress(-5000, 3600, 900)).toBe(1);
  });

  it('is proportional in between', () => {
    expect(sectionProgress(-1350, 3600, 900)).toBeCloseTo(0.5);
  });

  it('never divides by zero when the section is not taller than the viewport', () => {
    expect(sectionProgress(-100, 900, 900)).toBe(0);
    expect(sectionProgress(-100, 500, 900)).toBe(0);
  });
});

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
