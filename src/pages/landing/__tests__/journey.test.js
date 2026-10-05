import { describe, it, expect } from 'vitest';
import { STOPS, activeStop, journeyProgress, stopFractions } from '../journey';

describe('journeyProgress', () => {
  it('is 0 at the top and 1 at the very bottom', () => {
    expect(journeyProgress(0, 5000, 800)).toBe(0);
    expect(journeyProgress(4200, 5000, 800)).toBe(1);
  });

  it('is proportional in between', () => {
    expect(journeyProgress(2100, 5000, 800)).toBeCloseTo(0.5);
  });

  it('clamps overscroll (rubber-banding on a phone)', () => {
    expect(journeyProgress(-80, 5000, 800)).toBe(0);
    expect(journeyProgress(9999, 5000, 800)).toBe(1);
  });

  it('is 0, not NaN, when the page is no taller than the viewport', () => {
    expect(journeyProgress(10, 700, 800)).toBe(0);
    expect(journeyProgress(10, 800, 800)).toBe(0);
  });
});

describe('stopFractions', () => {
  it('places each section along the route by its top edge', () => {
    expect(stopFractions([0, 840, 2100, 4200], 5000, 800)).toEqual([0, 0.2, 0.5, 1]);
  });

  it('clamps a section whose top is beyond the scrollable range', () => {
    expect(stopFractions([0, 9000], 5000, 800)).toEqual([0, 1]);
  });

  it('puts every stop at 0 on a page with nothing to scroll', () => {
    expect(stopFractions([0, 300], 700, 800)).toEqual([0, 0]);
  });
});

describe('activeStop', () => {
  const fractions = [0, 0.2, 0.5, 1];

  it('starts on the first stop', () => {
    expect(activeStop(0, fractions)).toBe(0);
  });

  it('advances as the shuttle passes each stop', () => {
    expect(activeStop(0.19, fractions)).toBe(0);
    expect(activeStop(0.2, fractions)).toBe(1);
    expect(activeStop(0.49, fractions)).toBe(1);
    expect(activeStop(0.5, fractions)).toBe(2);
    expect(activeStop(1, fractions)).toBe(3);
  });

  it('stays on the first stop when nothing has moved, even if every stop collapses to 0', () => {
    expect(activeStop(0, [0, 0, 0, 0])).toBe(0);
  });

  it('counts landing a hair short of a section top as arriving', () => {
    expect(activeStop(0.1995, fractions)).toBe(1);
  });
});

describe('STOPS', () => {
  it('lists the page sections in order, each with a label', () => {
    expect(STOPS.map((s) => s.id)).toEqual(['top', 'what', 'how-it-works', 'join']);
    STOPS.forEach((stop) => expect(stop.label).toBeTruthy());
  });
});
