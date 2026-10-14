// The numbers behind "How it works". Pure functions, so every rule about what the story
// shows at a given moment can be tested without a browser or an animation library.
//
// The story is one film in four chapters. Its master timeline runs from 0 to CHAPTERS, and
// chapter `c` owns the stretch [c, c + 1]. Inside a chapter the content (a shuttle driving, a
// key being typed) plays over [c + CONTENT_START, c + CONTENT_START + CONTENT_LENGTH]; the
// device glides between sides across the boundaries, which is why the content leaves room at
// either end.

export const CHAPTERS = 4;

/**
 * How far the visitor scrolls, in screens, while the story is pinned and playing out. Generous on
 * purpose: the swap between chapters should be something you watch happen, not something that is
 * over in a flick, so each chapter gets 1.6 screens and the glide alone takes about two thirds of one.
 */
export const STORY_SCREENS = 6.5;

/** On a phone the pinned story is shorter (4.8 screens): a thumb covers less ground than a wheel. */
export const STORY_SCREENS_COMPACT = 4.8;
export const COMPACT_BELOW = 1024;
export const storyScreens = (width) => (width < COMPACT_BELOW ? STORY_SCREENS_COMPACT : STORY_SCREENS);

/** Half the width, in chapters, of the glide that carries the device from one side to the other. */
export const GLIDE = 0.2;

/** Where inside a chapter its content starts playing, and for how long. */
export const CONTENT_START = GLIDE;
export const CONTENT_LENGTH = 1 - 2 * GLIDE;

/** Where the device sits (as a percentage of its own width) in each chapter: left, right, left, right. */
export const SIDE_X = [0, 100, 0, 100];

/**
 * The compact (phone) layout has the device centred above its copy instead of beside it, so it
 * does not change sides: it sways a little left and right, as a percentage of its own (full) width,
 * and the laptop ends dead centre.
 */
export const SIDE_X_COMPACT = [-12, 12, -12, 0];

/**
 * Where along the map's route the shuttle passes each stop (0 = where it starts, 1 = the rider's
 * stop). Measured from the route drawn in MapScreen; if that path changes, measure again.
 */
export const STOP_FRACTIONS = [0, 0.38, 0.73, 1];

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/** 0..1 across the stretch [from, to] of a chapter's own 0..1 progress. */
export function windowProgress(progress, from, to) {
  if (to <= from) return progress >= to ? 1 : 0;
  return clamp01((progress - from) / (to - from));
}

/** The master-timeline time at which a chapter's content starts. */
export function contentStart(chapter) {
  return chapter + CONTENT_START;
}

/** How many of the key's characters have been typed so far. */
export function keyReveal(progress, count = 6) {
  return Math.round(windowProgress(progress, 0.04, 0.5) * count);
}

/** What the join screen says at a given moment: nothing sent, request sent, then waiting. */
export function enrollStatus(progress) {
  if (progress < 0.6) return 'idle';
  if (progress < 0.74) return 'sent';
  return 'waiting';
}

/** Whole minutes until the shuttle arrives, rounded up: four, closing to none. */
export function etaMinutes(progress) {
  return Math.ceil((240 * (1 - clamp01(progress))) / 60);
}

/** How many stops are still ahead of the shuttle, the rider's own included. */
export function stopsAway(progress) {
  const done = clamp01(progress);
  return STOP_FRACTIONS.filter((fraction) => fraction > done).length;
}

/** The second rider's shuttle: six minutes out, closing to two. */
export function profileEtaMinutes(progress) {
  return Math.max(2, Math.ceil((360 - 240 * clamp01(progress)) / 60));
}

/** "03 / 04": the chapter the visitor is in. */
export function chapterCounter(step, total = CHAPTERS) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(step + 1)} / ${pad(total)}`;
}
