// Pure maths for the scroll-scrubbed statement: how far a block has travelled
// through the reading zone of the viewport, and how lit each word should be.
// Kept apart from the component so it can be unit-tested without a browser.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * 0 while the block's top is still below 90% of the viewport height, 1 once its
 * bottom has passed 50%. In between, words are being read.
 */
export function scrubProgress(top, height, viewportHeight) {
  const travel = viewportHeight * 0.4 + height;
  if (travel <= 0) return 1;
  return clamp((viewportHeight * 0.9 - top) / travel, 0, 1);
}

/** Opacity of word `index` of `count`: dim until progress reaches it, then full. */
export function wordOpacity(progress, index, count, floor = 0.16) {
  if (count <= 0) return 1;
  const lit = clamp(progress * count - index, 0, 1);
  return floor + (1 - floor) * lit;
}
