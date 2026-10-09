// Pure maths for the "page is a route" rail: how far down the page the shuttle
// is, where each section's stop sits along the route, and which stop is current.
// Kept apart from the component so it can be unit-tested without a browser.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** The sections that are stops on the route, in page order. */
export const STOPS = [
  { id: 'top', label: 'Start' },
  { id: 'what', label: 'Why TrackMe' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'join', label: 'Get the app' },
];

/** 0 at the top of the page, 1 once the bottom has been reached. */
export function journeyProgress(scrollY, documentHeight, viewportHeight) {
  const travel = documentHeight - viewportHeight;
  if (travel <= 0) return 0;
  return clamp(scrollY / travel, 0, 1);
}

/** Where each section's top edge sits along the route, as a 0..1 fraction. */
export function stopFractions(tops, documentHeight, viewportHeight) {
  const travel = documentHeight - viewportHeight;
  if (travel <= 0) return tops.map(() => 0);
  return tops.map((top) => clamp(top / travel, 0, 1));
}

/** Index of the last stop the shuttle has reached. */
export function activeStop(progress, fractions) {
  // A shuttle that has not moved is still at the start, even on a page with
  // nothing to scroll where every stop's fraction collapses to 0.
  if (progress <= 0) return 0;
  let active = 0;
  fractions.forEach((fraction, index) => {
    // A hair of tolerance so landing exactly on a section top counts as arriving.
    if (progress + 0.001 >= fraction) active = index;
  });
  return active;
}
