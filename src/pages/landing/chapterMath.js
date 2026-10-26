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

/** "03 / 04": the chapter the visitor is in. */
export function chapterCounter(step, total = CHAPTERS) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(step + 1)} / ${pad(total)}`;
}
