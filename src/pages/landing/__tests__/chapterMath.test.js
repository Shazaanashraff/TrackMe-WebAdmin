import { describe, it, expect } from 'vitest';
import {
  CHAPTERS,
  CONTENT_LENGTH,
  CONTENT_START,
  GLIDE,
  SIDE_X,
  SIDE_X_COMPACT,
  STOP_FRACTIONS,
  STORY_SCREENS,
  STORY_SCREENS_COMPACT,
  chapterCounter,
  contentStart,
  enrollStatus,
  etaMinutes,
  keyReveal,
  profileEtaMinutes,
  stopsAway,
  storyScreens,
  windowProgress,
} from '../chapterMath';
import { STORY } from '../config';
import { sideForStep } from '../story';

describe('the story timeline', () => {
  it('has one chapter for every step of the story', () => {
    expect(CHAPTERS).toBe(STORY.length);
  });

  it('keeps a chapter\'s content between the two glides on either side of it', () => {
    // A chapter owns [c, c + 1]: glide (half), content, glide (half) must tile it exactly.
    expect(CONTENT_START).toBeCloseTo(GLIDE);
    expect(CONTENT_START + CONTENT_LENGTH + GLIDE).toBeCloseTo(1);
  });

  it('starts each chapter\'s content a little after the chapter begins', () => {
    expect(contentStart(0)).toBeCloseTo(0.2);
    expect(contentStart(2)).toBeCloseTo(2.2);
  });

  it('puts the device left, right, left, right, the same as the sides the story reports', () => {
    expect(SIDE_X).toEqual([0, 100, 0, 100]);
    expect(SIDE_X.map((x) => (x === 0 ? 'left' : 'right'))).toEqual([0, 1, 2, 3].map(sideForStep));
  });

  it('gives a phone a shorter story than a wheel gets, switching at the desktop breakpoint', () => {
    expect(storyScreens(1280)).toBe(STORY_SCREENS);
    expect(storyScreens(1024)).toBe(STORY_SCREENS);
    expect(storyScreens(1023)).toBe(STORY_SCREENS_COMPACT);
    expect(storyScreens(320)).toBe(STORY_SCREENS_COMPACT);
    expect(STORY_SCREENS_COMPACT).toBeLessThan(STORY_SCREENS);
    expect(STORY_SCREENS_COMPACT / CHAPTERS).toBeGreaterThanOrEqual(1); // still a screen or more per chapter
  });

  it('sways a phone gently instead of swapping sides: small, alternating, and the laptop dead centre', () => {
    expect(SIDE_X_COMPACT).toHaveLength(CHAPTERS);
    expect(SIDE_X_COMPACT[0]).toBeLessThan(0);
    expect(SIDE_X_COMPACT[1]).toBeGreaterThan(0);
    expect(SIDE_X_COMPACT[2]).toBeLessThan(0);
    expect(SIDE_X_COMPACT[3]).toBe(0); // the laptop sits in the middle
    SIDE_X_COMPACT.forEach((x) => expect(Math.abs(x)).toBeLessThanOrEqual(15));
  });
});

describe('windowProgress', () => {
  it('is 0 before the window, 1 after it, and proportional inside it', () => {
    expect(windowProgress(0.1, 0.2, 0.6)).toBe(0);
    expect(windowProgress(0.2, 0.2, 0.6)).toBe(0);
    expect(windowProgress(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
    expect(windowProgress(0.6, 0.2, 0.6)).toBe(1);
    expect(windowProgress(0.9, 0.2, 0.6)).toBe(1);
  });

  it('treats an empty window as a step instead of dividing by zero', () => {
    expect(windowProgress(0.3, 0.5, 0.5)).toBe(0);
    expect(windowProgress(0.5, 0.5, 0.5)).toBe(1);
  });
});

describe('the shuttle ride (chapter one)', () => {
  it('starts four minutes out and three stops away, and ends at the rider\'s stop', () => {
    expect(etaMinutes(0)).toBe(4);
    expect(stopsAway(0)).toBe(3);
    expect(etaMinutes(1)).toBe(0);
    expect(stopsAway(1)).toBe(0);
  });

  it('only ever counts down as the shuttle drives, never back up', () => {
    let eta = Infinity;
    let stops = Infinity;
    for (let p = 0; p <= 1.0001; p += 0.01) {
      expect(etaMinutes(p)).toBeLessThanOrEqual(eta);
      expect(stopsAway(p)).toBeLessThanOrEqual(stops);
      eta = etaMinutes(p);
      stops = stopsAway(p);
    }
  });

  it('counts whole minutes, rounded up', () => {
    expect(etaMinutes(0.24)).toBe(4);
    expect(etaMinutes(0.26)).toBe(3);
    expect(etaMinutes(0.9)).toBe(1);
  });

  it('counts a stop as passed the moment the shuttle reaches it', () => {
    const [, first, second] = STOP_FRACTIONS;
    expect(STOP_FRACTIONS[0]).toBe(0);
    expect(STOP_FRACTIONS.at(-1)).toBe(1);

    expect(stopsAway(first - 0.01)).toBe(3);
    expect(stopsAway(first)).toBe(2);
    expect(stopsAway(second - 0.01)).toBe(2);
    expect(stopsAway(second)).toBe(1);
    expect(stopsAway(0.99)).toBe(1); // only the rider's own stop is left
    expect(stopsAway(1)).toBe(0);
  });

  it('keeps the stop fractions in order, so a later stop is never passed first', () => {
    const sorted = [...STOP_FRACTIONS].sort((a, b) => a - b);
    expect(STOP_FRACTIONS).toEqual(sorted);
  });
});

describe('joining with a key (chapter two)', () => {
  it('types the key one character at a time, all six by the middle of the chapter', () => {
    expect(keyReveal(0)).toBe(0);
    expect(keyReveal(0.27)).toBeGreaterThan(0);
    expect(keyReveal(0.27)).toBeLessThan(6);
    expect(keyReveal(0.5)).toBe(6);
    expect(keyReveal(1)).toBe(6);
  });

  it('only ever types more, never fewer', () => {
    let typed = -1;
    for (let p = 0; p <= 1.0001; p += 0.01) {
      expect(keyReveal(p)).toBeGreaterThanOrEqual(typed);
      typed = keyReveal(p);
    }
  });

  it('goes from nothing sent, to sent, to waiting for the manager, and no further', () => {
    expect(enrollStatus(0)).toBe('idle');
    expect(enrollStatus(0.5)).toBe('idle');
    expect(enrollStatus(0.65)).toBe('sent');
    expect(enrollStatus(0.8)).toBe('waiting');
    expect(enrollStatus(1)).toBe('waiting');
  });

  it('only sends once the whole key has been typed', () => {
    for (let p = 0; p <= 1.0001; p += 0.01) {
      if (enrollStatus(p) !== 'idle') expect(keyReveal(p)).toBe(6);
    }
  });
});

describe('the second rider\'s shuttle (chapter three)', () => {
  it('starts six minutes out and closes to two, never below', () => {
    expect(profileEtaMinutes(0)).toBe(6);
    expect(profileEtaMinutes(1)).toBe(2);
    expect(profileEtaMinutes(5)).toBe(2);
  });
});

describe('chapterCounter', () => {
  it('shows the chapter and the total, zero padded', () => {
    expect(chapterCounter(0)).toBe('01 / 04');
    expect(chapterCounter(3)).toBe('04 / 04');
    expect(chapterCounter(1, 12)).toBe('02 / 12');
  });
});
