// Top-down vehicle for the fleet map, drawn pointing "up" (north). Same drawing as
// the passenger app's live map (user-app src/features/live-map/vehicleIcon.js); the
// repos share no code, so keep the two in step by hand.
//
// A Google Maps image marker cannot rotate, so the heading is baked into the SVG
// itself: the vehicle group turns about the centre of the 54x54 viewBox.

const VIEWBOX = 54;
const CENTRE = VIEWBOX / 2;

function normalizeHeading(heading) {
  const value = Number(heading);
  if (!Number.isFinite(value)) return 0;
  return ((value % 360) + 360) % 360;
}

/**
 * SVG markup for the vehicle.
 * - `heading`: degrees clockwise from north; anything non-numeric faces north.
 * - `accent`: the roof stripe colour, which carries the tracking state
 *   (live / stale / offline) the circle marker used to show by fill colour.
 */
export function vehicleIconSvg({ heading = 0, accent = '#15803d' } = {}) {
  const rotation = normalizeHeading(heading);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEWBOX}" height="${VIEWBOX}" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="#eef1f6"/>
      <stop offset="1" stop-color="#cfd5df"/>
    </linearGradient>
    <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="1.6" stdDeviation="1.8" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <g transform="rotate(${rotation} ${CENTRE} ${CENTRE})" filter="url(#s)">
    <rect x="14.5" y="18" width="3.4" height="7.5" rx="1.5" fill="#191c22"/>
    <rect x="36.1" y="18" width="3.4" height="7.5" rx="1.5" fill="#191c22"/>
    <rect x="14.5" y="30" width="3.4" height="7.5" rx="1.5" fill="#191c22"/>
    <rect x="36.1" y="30" width="3.4" height="7.5" rx="1.5" fill="#191c22"/>
    <rect x="16.5" y="7" width="21" height="41" rx="8" fill="url(#body)" stroke="#9299a6" stroke-width="0.9"/>
    <rect x="19.5" y="10.5" width="15" height="2" rx="1" fill="${accent}"/>
    <path d="M19.5 13.5 Q27 10.8 34.5 13.5 L33 18.5 Q27 16 21 18.5 Z" fill="#1e2c3c"/>
    <rect x="18.5" y="21" width="3.6" height="14" rx="1.4" fill="#2a3948"/>
    <rect x="31.9" y="21" width="3.6" height="14" rx="1.4" fill="#2a3948"/>
    <rect x="23" y="20.5" width="8" height="17" rx="2.5" fill="#f4f7fb" stroke="#d7dde6" stroke-width="0.7"/>
    <rect x="24.6" y="23" width="4.8" height="4.5" rx="1" fill="#e2e7ef"/>
    <rect x="24.6" y="29" width="4.8" height="5" rx="1" fill="#e8ecf2"/>
    <path d="M20.5 40.5 Q27 43 33.5 40.5 L34.5 44 Q27 46.5 19.5 44 Z" fill="#28323e"/>
  </g>
</svg>`;
}

/** The vehicle as a data URI for a Google Maps marker `icon.url`. */
export function vehicleIconUrl(options) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(vehicleIconSvg(options))}`;
}

/** A location's heading as a number, or null when the driver sent none (parked). */
export function headingOf(location) {
  const value = location?.heading;
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
