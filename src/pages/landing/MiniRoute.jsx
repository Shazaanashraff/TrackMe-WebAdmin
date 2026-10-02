import { useId } from 'react';

/** A small animated route, used as card decoration. Purely illustrative. */
export function MiniRoute({ className, wide = false }) {
  const id = useId();
  const d = wide
    ? 'M10 80 C 90 20, 160 110, 260 60 S 420 10, 510 70 S 640 100, 700 40'
    : 'M12 130 C 50 80, 30 50, 90 40 S 170 70, 188 14';
  const box = wide ? '0 0 710 120' : '0 0 200 150';
  const dots = wide ? [[10, 80], [260, 60], [510, 70], [700, 40]] : [[12, 130], [90, 40], [188, 14]];

  return (
    <svg aria-hidden="true" viewBox={box} className={className} fill="none">
      <path d={d} stroke="#2dd4bf" strokeOpacity="0.2" strokeWidth="7" strokeLinecap="round" />
      <path id={id} d={d} stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" className="l-route-dash" />
      {dots.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#04090b" stroke="#5eead4" strokeWidth="2" />
      ))}
      <circle r="6" fill="#ecfeff" stroke="#0f766e" strokeWidth="2.5">
        <animateMotion dur={wide ? '9s' : '6s'} repeatCount="indefinite"><mpath href={`#${id}`} /></animateMotion>
      </circle>
    </svg>
  );
}
