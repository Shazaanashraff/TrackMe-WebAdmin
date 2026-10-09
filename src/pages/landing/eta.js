// The hero's live arrival countdown. It answers the headline's question
// ("Where's the shuttle?") with a number that visibly moves. Illustrative only:
// it is a demo of the product, not real data, and the page says nothing more.

export const ETA_START = 240; // 4:00
const ETA_HOLD = 3; // seconds spent on "Arriving now" before the loop restarts

/** The next second on the clock; after "now", the loop starts over. */
export function nextEta(seconds) {
  return seconds <= -ETA_HOLD ? ETA_START : seconds - 1;
}

/** "3:41" while counting down, "Now" once the shuttle has arrived. */
export function formatEta(seconds) {
  if (seconds <= 0) return 'Now';
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}
