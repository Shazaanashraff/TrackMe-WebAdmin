// Pure maths for the sticky "How it works" scroll story, kept apart from the
// component so the step boundaries can be unit-tested without a browser.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * 0 when the section's top edge reaches the top of the viewport, 1 when its
 * sticky stage is about to scroll away (section height minus one viewport).
 */
export function sectionProgress(top, height, viewportHeight) {
  const travel = height - viewportHeight;
  if (travel <= 0) return 0;
  return clamp(-top / travel, 0, 1);
}

/** Which of `count` steps owns a given progress. The last step gets a dwell. */
export function stepFromProgress(progress, count) {
  if (count <= 1) return 0;
  return clamp(Math.floor(clamp(progress, 0, 1) * count), 0, count - 1);
}

/** The device alternates sides: left on even steps, right on odd ones. */
export function sideForStep(step) {
  return step % 2 === 0 ? 'left' : 'right';
}
