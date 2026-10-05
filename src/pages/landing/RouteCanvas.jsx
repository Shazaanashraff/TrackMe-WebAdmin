import { useMemo } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';

// A hand-tuned set of cubic routes across a 1600x900 canvas. Vehicles travel
// along them with SVG motion paths, so the hero stays alive with zero assets.
const ROUTES = [
  'M-40 700 C 220 640, 360 520, 560 540 S 900 700, 1120 560 S 1480 300, 1660 340',
  'M-40 260 C 180 300, 300 180, 520 200 S 820 360, 980 300 S 1320 120, 1660 160',
  'M200 940 C 260 760, 520 700, 640 520 S 760 220, 980 120 S 1240 -20, 1300 -40',
  'M1660 760 C 1420 700, 1280 820, 1080 760 S 760 560, 560 640 S 200 780, -40 740',
  'M820 -40 C 760 180, 900 320, 840 480 S 740 760, 820 940',
];

const NODES = [
  [560, 540], [1120, 560], [520, 200], [980, 300], [640, 520], [980, 120],
  [1080, 760], [560, 640], [840, 480],
];

export function RouteCanvas({ className }) {
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const vehicles = useMemo(
    () => ROUTES.map((_, i) => ({ id: i, dur: 22 + i * 5, begin: -i * 7 })),
    [],
  );

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      <defs>
        <linearGradient id="l-route" x1="0" x2="1">
          <stop offset="0" stopColor="#2dd4bf" stopOpacity="0" />
          <stop offset="0.5" stopColor="#2dd4bf" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7dd3fc" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="l-halo">
          <stop offset="0" stopColor="#5eead4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#5eead4" stopOpacity="0" />
        </radialGradient>
      </defs>

      {ROUTES.map((d, i) => (
        <g key={d}>
          <path id={`l-r${i}`} d={d} fill="none" stroke="url(#l-route)" strokeWidth="1.5" />
          <path d={d} fill="none" stroke="#2dd4bf" strokeOpacity="0.22" strokeWidth="1" className="l-route-dash" />
        </g>
      ))}

      {NODES.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="14" fill="url(#l-halo)" opacity="0.5" />
          <circle cx={x} cy={y} r="3.5" fill="#04090b" stroke="#5eead4" strokeWidth="1.5" />
        </g>
      ))}

      {!reduce && vehicles.map(({ id, dur, begin }) => (
        <g key={id}>
          <circle r="22" fill="url(#l-halo)">
            <animateMotion dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite">
              <mpath href={`#l-r${id}`} />
            </animateMotion>
          </circle>
          <circle r="4.5" fill="#ecfeff">
            <animateMotion dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite">
              <mpath href={`#l-r${id}`} />
            </animateMotion>
          </circle>
        </g>
      ))}
    </svg>
  );
}
