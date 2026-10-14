// Pure maths for the pinned "How it works" story, kept apart from the component so the
// chapter boundaries can be unit-tested without a browser. (The finer timing inside a chapter
// lives in chapterMath.js.)

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Which of `count` steps owns a given progress. The last step gets a dwell. */
export function stepFromProgress(progress, count) {
  if (count <= 1) return 0;
  return clamp(Math.floor(clamp(progress, 0, 1) * count), 0, count - 1);
}

/** The device alternates sides: left on even steps, right on odd ones. */
export function sideForStep(step) {
  return step % 2 === 0 ? 'left' : 'right';
}
