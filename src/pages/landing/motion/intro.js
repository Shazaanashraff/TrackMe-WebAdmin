// The logic around the landing page's opening sequence (the loader). Pure, so it
// can be tested without a browser.

export const INTRO_KEY = 'trackme-intro-seen';

/** The loader may never keep a visitor out for longer than this, whatever goes wrong. */
export const INTRO_MAX_MS = 3600;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Play the opening once per visit, and only where it can run and is welcome:
 * not for visitors who prefer reduced motion, not where animation is unavailable,
 * and not again for someone who has already seen it this session.
 */
export function shouldPlayIntro({ canAnimate, reduced, seen }) {
  return Boolean(canAnimate) && !reduced && !seen;
}

export function readIntroSeen(storage) {
  try {
    return storage?.getItem(INTRO_KEY) === '1';
  } catch {
    return false; // storage blocked: treat as unseen, never crash
  }
}

export function markIntroSeen(storage) {
  try {
    storage?.setItem(INTRO_KEY, '1');
  } catch {
    // storage blocked: the worst outcome is seeing the opening again
  }
}

/** 0..100 as the counter's three digits: 000, 042, 100. */
export function padCount(value) {
  return String(Math.round(clamp(Number(value) || 0, 0, 100))).padStart(3, '0');
}

/** Where, as percentages of the screen, the page opens from: the shuttle's spot in the hero. */
export function irisOrigin(width, height) {
  return height > width ? { x: 50, y: 40 } : { x: 80, y: 50 };
}
