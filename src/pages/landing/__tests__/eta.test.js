import { describe, it, expect } from 'vitest';
import { ETA_START, formatEta, nextEta } from '../eta';

describe('formatEta', () => {
  it('shows minutes and zero-padded seconds while counting down', () => {
    expect(formatEta(240)).toBe('4:00');
    expect(formatEta(239)).toBe('3:59');
    expect(formatEta(61)).toBe('1:01');
    expect(formatEta(9)).toBe('0:09');
  });

  it('says "Now" once the shuttle has arrived, never a negative time', () => {
    expect(formatEta(0)).toBe('Now');
    expect(formatEta(-2)).toBe('Now');
  });
});

describe('nextEta', () => {
  it('ticks down one second at a time', () => {
    expect(nextEta(240)).toBe(239);
    expect(nextEta(1)).toBe(0);
  });

  it('holds on "Now" for a few seconds, then starts the loop again', () => {
    expect(nextEta(0)).toBe(-1);
    expect(nextEta(-2)).toBe(-3);
    expect(nextEta(-3)).toBe(ETA_START);
  });

  it('always shows a countdown that can be read: from the start it reaches Now', () => {
    let seconds = ETA_START;
    let sawNow = false;
    for (let i = 0; i < 400; i += 1) {
      seconds = nextEta(seconds);
      if (formatEta(seconds) === 'Now') sawNow = true;
    }
    expect(sawNow).toBe(true);
  });
});
