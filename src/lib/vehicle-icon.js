// Fleet map vehicle: a white passenger van seen from above, drawn pointing "up"
// (north). Same drawing as the passenger app's live map (user-app
// src/features/live-map/vehicleIcon.js); the repos share no code, so keep the two
// in step by hand.
//
// A Google Maps image marker cannot rotate, so the heading is baked into the SVG
// itself: the van turns about the centre of the 54x54 viewBox.

const VIEWBOX = 54;
const CENTRE = VIEWBOX / 2;

const BODY = ['#FFFFFF', '#EEF1F5', '#DCE1E8'];
const GLASS = '#27323F';
const ROOF = '#F7F9FB';
const RIB = '#E5E7EB';
const MIRROR = '#A3ACB9';

function normalizeHeading(heading) {
  const value = Number(heading);
  if (!Number.isFinite(value)) return 0;
  return ((value % 360) + 360) % 360;
}

/**
 * SVG markup for the van.
 * - `heading`: degrees clockwise from north; anything non-numeric faces north.
 * - `accent`: the van's outline colour, which carries the tracking state
 *   (live / stale / offline) the circle marker used to show by fill colour.
 */
export function vehicleIconSvg({ heading = 0, accent = '#15803d' } = {}) {
  const rotation = normalizeHeading(heading);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEWBOX}" height="${VIEWBOX}" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}">
  <defs>
    <linearGradient id="vb" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${BODY[0]}"/>
      <stop offset="0.55" stop-color="${BODY[1]}"/>
      <stop offset="1" stop-color="${BODY[2]}"/>
    </linearGradient>
    <filter id="s" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="1.6" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <g transform="rotate(${rotation} ${CENTRE} ${CENTRE})" filter="url(#s)">
    <g transform="translate(${CENTRE} ${CENTRE}) scale(1.3) translate(-${CENTRE} -${CENTRE})">
      <rect x="17.3" y="13.6" width="2.2" height="3" rx="1" fill="${MIRROR}"/>
      <rect x="34.5" y="13.6" width="2.2" height="3" rx="1" fill="${MIRROR}"/>
      <rect x="19" y="10" width="16" height="34" rx="3" fill="url(#vb)" stroke="${accent}" stroke-width="1.3"/>
      <path d="M20.2 17.8 L20.9 12.9 Q27 11.6 33.1 12.9 L33.8 17.8 Q27 16.9 20.2 17.8 Z" fill="${GLASS}"/>
      <rect x="19.8" y="19.2" width="1.5" height="5.6" rx="0.6" fill="${GLASS}"/>
      <rect x="19.8" y="25.6" width="1.5" height="5.6" rx="0.6" fill="${GLASS}"/>
      <rect x="19.8" y="32" width="1.5" height="5.6" rx="0.6" fill="${GLASS}"/>
      <rect x="32.7" y="19.2" width="1.5" height="5.6" rx="0.6" fill="${GLASS}"/>
      <rect x="32.7" y="25.6" width="1.5" height="5.6" rx="0.6" fill="${GLASS}"/>
      <rect x="32.7" y="32" width="1.5" height="5.6" rx="0.6" fill="${GLASS}"/>
      <rect x="21.8" y="19" width="10.4" height="21.4" rx="1.2" fill="${ROOF}" stroke="${RIB}" stroke-width="0.5"/>
      <rect x="22.6" y="24.3" width="8.8" height="0.6" fill="${RIB}"/>
      <rect x="22.6" y="29.4" width="8.8" height="0.6" fill="${RIB}"/>
      <rect x="22.6" y="34.5" width="8.8" height="0.6" fill="${RIB}"/>
      <rect x="21.2" y="41" width="11.6" height="1.9" rx="0.6" fill="${GLASS}"/>
    </g>
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
