import { describe, it, expect } from 'vitest';
import { scrubProgress, wordOpacity } from '../scrub';

describe('scrubProgress', () => {
  // A 300px-tall block in an 800px viewport. Reading starts when its top is at
  // 90% of the viewport (720) and ends when its bottom passes 50% (400).
  it('is 0 while the block is still below the reading line', () => {
    expect(scrubProgress(720, 300, 800)).toBe(0);
    expect(scrubProgress(900, 300, 800)).toBe(0);
  });

  it('is 1 once the block has scrolled past the middle of the screen', () => {
    expect(scrubProgress(100, 300, 800)).toBe(1);
    expect(scrubProgress(-500, 300, 800)).toBe(1);
  });

  it('moves smoothly in between', () => {
    expect(scrubProgress(410, 300, 800)).toBeCloseTo(0.5, 1);
  });

  it('never returns NaN for a collapsed block or viewport', () => {
    expect(scrubProgress(0, 0, 0)).toBe(1);
  });
});

describe('wordOpacity', () => {
  it('keeps every word dim before reading starts', () => {
    [0, 3, 9].forEach((i) => expect(wordOpacity(0, i, 10)).toBeCloseTo(0.16));
  });

  it('lights every word fully once reading is done', () => {
    [0, 3, 9].forEach((i) => expect(wordOpacity(1, i, 10)).toBe(1));
  });

  it('lights words in order, first to last', () => {
    const ten = Array.from({ length: 10 }, (_, i) => wordOpacity(0.5, i, 10));
    expect(ten.slice(0, 5).every((v) => v === 1)).toBe(true);
    expect(ten.slice(5).every((v) => v < 1)).toBe(true);
    expect(ten).toEqual([...ten].sort((a, b) => b - a));
  });

  it('eases the word currently being read between dim and full', () => {
    const mid = wordOpacity(0.55, 5, 10); // halfway through word 5
    expect(mid).toBeGreaterThan(0.16);
    expect(mid).toBeLessThan(1);
  });

  it('shows everything when there are no words to scrub', () => {
    expect(wordOpacity(0, 0, 0)).toBe(1);
  });
});
