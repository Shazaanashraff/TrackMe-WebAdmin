import { Box } from '@mui/material';
import sriLankaMap from '@svg-maps/sri-lanka';

export const MAP_BG = '#050b16';

// Hub coordinates below are bounding-box centers of the real district polygons
// from @svg-maps/sri-lanka (same viewBox: "0 0 450 793"), not invented points —
// computed offline from the package's own path data.
const HUBS = [
  { id: 'colombo', name: 'Colombo', cx: 77.3, cy: 605.1, major: true },
  { id: 'kandy', name: 'Kandy', cx: 215.7, cy: 531.1 },
  { id: 'jaffna', name: 'Jaffna', cx: 98.0, cy: 38.6 },
  { id: 'trincomalee', name: 'Trincomalee', cx: 288.2, cy: 257.0 },
  { id: 'anuradhapura', name: 'Anuradhapura', cx: 165.8, cy: 297.9 },
  { id: 'galle', name: 'Galle', cx: 119.6, cy: 735.1 },
  { id: 'batticaloa', name: 'Batticaloa', cx: 376.6, cy: 406.0 },
  { id: 'kurunegala', name: 'Kurunegala', cx: 118.8, cy: 427.6 },
  { id: 'ratnapura', name: 'Ratnapura', cx: 184.6, cy: 659.1 },
  { id: 'badulla', name: 'Badulla', cx: 277.3, cy: 557.4 },
  { id: 'matara', name: 'Matara', cx: 181.8, cy: 744.0 },
  { id: 'puttalam', name: 'Puttalam', cx: 55.3, cy: 389.2 },
  { id: 'polonnaruwa', name: 'Polonnaruwa', cx: 281.4, cy: 373.2 },
  { id: 'ampara', name: 'Ampara', cx: 358.7, cy: 548.8 },
  { id: 'moneragala', name: 'Moneragala', cx: 319.2, cy: 599.1 },
  { id: 'kegalle', name: 'Kegalle', cx: 140.7, cy: 551.5 },
  { id: 'nuwara-eliya', name: 'Nuwara Eliya', cx: 211.7, cy: 571.8 },
  { id: 'hambantota', name: 'Hambantota', cx: 304.0, cy: 720.4 },
  { id: 'vavuniya', name: 'Vavuniya', cx: 167.3, cy: 203.1 },
  { id: 'mannar', name: 'Mannar', cx: 80.2, cy: 194.3 }
];

const HUB_BY_ID = Object.fromEntries(HUBS.map((hub) => [hub.id, hub]));

// A spanning mesh spread across the island rather than a single hub-and-spoke —
// no city carries more than a handful of connections, so the network reads as
// island-wide, not "everything radiates from Colombo".
const ROUTE_EDGES = [
  ['mannar', 'vavuniya'],
  ['vavuniya', 'jaffna'],
  ['vavuniya', 'anuradhapura'],
  ['anuradhapura', 'polonnaruwa'],
  ['anuradhapura', 'trincomalee'],
  ['polonnaruwa', 'trincomalee'],
  ['polonnaruwa', 'batticaloa'],
  ['anuradhapura', 'puttalam'],
  ['anuradhapura', 'kurunegala'],
  ['puttalam', 'kurunegala'],
  ['kurunegala', 'colombo'],
  ['kurunegala', 'kandy'],
  ['kandy', 'trincomalee'],
  ['kandy', 'nuwara-eliya'],
  ['nuwara-eliya', 'badulla'],
  ['kandy', 'kegalle'],
  ['kegalle', 'colombo'],
  ['kegalle', 'ratnapura'],
  ['badulla', 'batticaloa'],
  ['badulla', 'moneragala'],
  ['moneragala', 'ampara'],
  ['ampara', 'batticaloa'],
  ['badulla', 'ratnapura'],
  ['ratnapura', 'colombo'],
  ['ratnapura', 'matara'],
  ['ratnapura', 'hambantota'],
  ['hambantota', 'moneragala'],
  ['colombo', 'galle'],
  ['galle', 'matara'],
  ['matara', 'hambantota']
];

// Deterministic pseudo-random offset in [-0.5, 0.5] from a string seed, so the
// road bends below are stable across renders/tests instead of reshuffling.
function seededOffset(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 10000;
  return hash / 10000 - 0.5;
}

// Midpoint-displacement subdivision: recursively bends the segment at its
// midpoint by a shrinking, seeded offset. Straight-line ("L") segments only —
// this is what makes a chain of them read as a turn-by-turn road route
// (like a Google/Uber map polyline) instead of one smooth curve.
function subdivide(p0, p1, seed, depth, roughness) {
  if (depth === 0) return [p0, p1];

  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = -dy / length;
  const uy = dx / length;
  const offset = seededOffset(seed) * length * roughness;
  const mid = { x: mx + ux * offset, y: my + uy * offset };

  const left = subdivide(p0, mid, `${seed}L`, depth - 1, roughness * 0.55);
  const right = subdivide(mid, p1, `${seed}R`, depth - 1, roughness * 0.55);
  return [...left.slice(0, -1), ...right];
}

function roadPath(from, to, seed) {
  const points = subdivide({ x: from.cx, y: from.cy }, { x: to.cx, y: to.cy }, seed, 4, 0.28);
  return points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

export function SriLankaRouteMap() {
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', minHeight: { xs: 320, md: 620 }, backgroundColor: MAP_BG }}>
      <Box
        component="svg"
        viewBox="-70 -40 590 873"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Live route network map of Sri Lanka"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <style>{`
          .sl-coastline { fill: none; stroke: #3d5674; stroke-width: 1.5; stroke-linejoin: round; }
          .sl-district { fill: #0e2036; stroke: none; }
          .sl-road { fill: none; stroke: #3F6FF3; stroke-width: 0.9; opacity: 0.7; stroke-linejoin: round; stroke-linecap: round; }
          .sl-pulse { fill: #93B4FB; }
          .sl-dot { fill: #3F6FF3; }
          .sl-dot-major { fill: #93B4FB; }
          .sl-ring { fill: none; stroke: #3F6FF3; stroke-width: 1; opacity: 0.5; animation: sl-ripple 2.8s ease-out infinite; transform-origin: center; transform-box: fill-box; }
          @keyframes sl-ripple {
            0% { transform: scale(1); opacity: 0.55; }
            100% { transform: scale(3.2); opacity: 0; }
          }
          .sl-label { fill: #7C8AA8; font-size: 10.5px; font-family: inherit; }
          .sl-label-major { fill: #E5E9F5; font-size: 12px; font-family: inherit; }
        `}</style>

        <rect x="-70" y="-40" width="590" height="873" fill={MAP_BG} />

        {/*
          Two-pass render: a thick outline stroke drawn first, then every district's fill drawn
          again on top with no stroke. Adjacent districts share exact vertices, so the second
          pass paints over every internal province border, so only the true coastline (nothing
          to paint over it) stays visible as an outline. Avoids needing a polygon-union
          library just to get an "outer border only" outline from per-district paths.
        */}
        {sriLankaMap.locations.map((location) => (
          <path key={`coastline-${location.id}`} className="sl-coastline" d={location.path} />
        ))}
        {sriLankaMap.locations.map((location) => (
          <path key={location.id} className="sl-district" d={location.path} />
        ))}

        {ROUTE_EDGES.map(([fromId, toId]) => {
          const from = HUB_BY_ID[fromId];
          const to = HUB_BY_ID[toId];
          const edgeId = `route-${fromId}-${toId}`;
          return <path key={edgeId} id={edgeId} className="sl-road" d={roadPath(from, to, edgeId)} />;
        })}

        {ROUTE_EDGES.map(([fromId, toId], index) => {
          const edgeId = `route-${fromId}-${toId}`;
          return (
            <circle key={`pulse-${edgeId}`} r="2" className="sl-pulse">
              <animateMotion dur={`${7 + (index % 5)}s`} begin={`${index * 0.4}s`} repeatCount="indefinite">
                <mpath href={`#${edgeId}`} />
              </animateMotion>
            </circle>
          );
        })}

        {HUBS.map((hub) =>
          hub.major ? (
            <g key={`marker-${hub.id}`}>
              <circle cx={hub.cx} cy={hub.cy} r="5" className="sl-ring" />
              <circle cx={hub.cx} cy={hub.cy} r="4" className="sl-dot-major" />
              <text x={hub.cx + 9} y={hub.cy + 4} className="sl-label-major">
                {hub.name}
              </text>
            </g>
          ) : (
            <g key={`marker-${hub.id}`}>
              <circle cx={hub.cx} cy={hub.cy} r="2.4" className="sl-dot" />
              <text x={hub.cx + 6} y={hub.cy + 3.5} className="sl-label">
                {hub.name}
              </text>
            </g>
          )
        )}
      </Box>
    </Box>
  );
}
