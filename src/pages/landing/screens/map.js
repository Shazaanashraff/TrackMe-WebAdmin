import { STOP_FRACTIONS, etaMinutes, stopsAway } from '../chapterMath';
import { scrubbed, setFlag, setText } from './play';

// The rider's live map, as a scene: what MapScreen.jsx draws, and how scrolling moves it.

export const ROUTE = 'M34 470 C 70 400, 46 340, 112 306 S 214 250, 196 178 S 150 110, 210 64';
export const STOPS = [[34, 470], [112, 306], [196, 178], [210, 64]];

// Before any animation runs the shuttle rests at the second stop: 3 min, 2 stops away.
export const REST = { x: 112, y: 306, progress: 0.38 };
export const LIT = '#5eead4';
export const UNLIT = '#0a1722';

/** "3 min" while it is coming; "Here" once it has arrived. */
export const etaText = (minutes) => (minutes > 0 ? `${minutes} min` : 'Here');

export const awayText = (stops) => {
  if (stops <= 0) return 'At your stop';
  return stops === 1 ? '1 stop away' : `${stops} stops away`;
};

/**
 * Draw the screen as it is `progress` (0..1) of the way through the ride: the shuttle on the
 * route, the driven part lit, stops lighting as it passes, and the arrival card counting down.
 */
export function paintMap(root, progress) {
  const route = root.querySelector('[data-route]');
  const marker = root.querySelector('[data-marker]');
  const travelled = root.querySelector('[data-travelled]');

  if (route && typeof route.getTotalLength === 'function' && marker) {
    const point = route.getPointAtLength(route.getTotalLength() * progress);
    marker.setAttribute('transform', `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);
  }
  // pathLength is normalised to 1 on the bright path, so the dash is simply the progress.
  if (travelled) travelled.setAttribute('stroke-dasharray', `${progress.toFixed(4)} 1`);

  root.querySelectorAll('[data-stop]').forEach((stop, i) => {
    const lit = progress >= STOP_FRACTIONS[i];
    const fill = lit ? LIT : UNLIT;
    if (stop.getAttribute('fill') !== fill) stop.setAttribute('fill', fill);
    setFlag(stop, 'data-lit', lit);
  });

  const minutes = etaMinutes(progress);
  setText(root.querySelector('[data-eta]'), etaText(minutes));
  setText(root.querySelector('[data-eta-label]'), minutes > 0 ? 'Arriving in' : 'Your shuttle is');
  setText(root.querySelector('[data-away]'), awayText(stopsAway(progress)));
  const bar = root.querySelector('[data-bar]');
  if (bar) bar.style.width = `${Math.round(6 + progress * 94)}%`;
}

/** The shuttle drives its route as the visitor scrolls. */
export function playMap(tl, root, at, span) {
  scrubbed(tl, at, span, (progress) => paintMap(root, progress));
}
