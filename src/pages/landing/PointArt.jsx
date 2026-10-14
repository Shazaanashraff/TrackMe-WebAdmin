import { useMotion } from './motion/context';

// Three small drawings, one for each of the three points under the statement. Drawn in code, in the
// current text colour, and decorative: the words beside them carry the meaning.

const ROUTE = 'M12 98 C 50 98 56 40 100 48 S 160 94 196 52 S 226 22 232 18';

/** A route across a few city blocks with a shuttle driving it. */
export function LiveMapArt({ className }) {
  const { reduced } = useMotion();
  return (
    <svg viewBox="0 0 240 120" fill="none" aria-hidden="true" className={className}>
      <g stroke="currentColor" strokeOpacity="0.14">
        {[22, 54, 86].map((y) => <path key={y} d={`M0 ${y}H240`} />)}
        {[44, 96, 148, 200].map((x) => <path key={x} d={`M${x} 0V120`} />)}
      </g>
      {/* data-draw: the thick road draws itself in as the card scrolls into view (WhatSection). */}
      <path data-draw d={ROUTE} pathLength="1" stroke="currentColor" strokeOpacity="0.26" strokeWidth="7" strokeLinecap="round" />
      <path d={ROUTE} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 7" />
      {[[12, 98], [100, 48], [196, 52], [232, 18]].map(([x, y]) => (
        <circle key={`${x}-${y}`} data-stop cx={x} cy={y} r="4" fill="var(--l-bone)" stroke="currentColor" strokeWidth="2" />
      ))}
      <g transform={reduced ? 'translate(100 48)' : undefined}>
        <circle r="15" fill="currentColor" opacity="0.2" />
        <circle r="6" fill="currentColor" />
        {reduced ? null : <animateMotion dur="8s" repeatCount="indefinite" path={ROUTE} />}
      </g>
    </svg>
  );
}

const KEY = ['T', 'M', '4', 'F', '7', 'K'];

/** A driver's key, typed in, and the approval that follows it. */
export function KeyArt({ className }) {
  return (
    <svg viewBox="0 0 240 120" fill="none" aria-hidden="true" className={className}>
      {KEY.map((letter, i) => (
        <g key={letter + i} data-key>
          <rect x={12 + i * 37} y="18" width="30" height="40" rx="8" stroke="currentColor" strokeOpacity={i === 5 ? 1 : 0.5} strokeWidth="1.5" />
          <text
            x={27 + i * 37}
            y="44"
            textAnchor="middle"
            fill="currentColor"
            fontSize="16"
            fontWeight="600"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {letter}
          </text>
        </g>
      ))}
      <g data-approved>
        <rect x="12" y="76" width="216" height="30" rx="15" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
        <circle cx="33" cy="91" r="8" fill="currentColor" />
        <path d="M29 91l3 3 6-6" stroke="var(--l-bone)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="50" y="95" fill="currentColor" fontSize="11" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
          MANAGER APPROVED
        </text>
      </g>
    </svg>
  );
}

/** A small fleet: three vehicles, their progress, their status. */
export function FleetArt({ className }) {
  const rows = [
    { y: 20, done: 150 },
    { y: 54, done: 98 },
    { y: 88, done: 176 },
  ];
  return (
    <svg viewBox="0 0 240 120" fill="none" aria-hidden="true" className={className}>
      {rows.map(({ y, done }, i) => (
        <g key={y}>
          <rect x="12" y={y - 8} width="22" height="16" rx="4" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="19" cy={y + 9} r="2.5" fill="currentColor" />
          <circle cx="28" cy={y + 9} r="2.5" fill="currentColor" />
          <rect x="46" y={y - 4} width="150" height="8" rx="4" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
          <rect data-bar x="46" y={y - 4} width={Math.min(done, 150)} height="8" rx="4" fill="currentColor" />
          <circle cx="216" cy={y} r="6" fill={i === 1 ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}
