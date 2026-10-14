import { STOP_FRACTIONS } from '../chapterMath';
import { LIT, REST, ROUTE, STOPS, UNLIT } from './map';

// Illustrative rider "live map" screen. Generic sample content, not real data.
// How scrolling plays it lives in map.js.

export default function MapScreen() {
  return (
    <div className="absolute inset-0 text-white">
      <svg viewBox="0 0 270 560" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect width="270" height="560" fill="#0a1722" />
        <g stroke="#13232f" strokeWidth="1">
          {[60, 130, 200, 270, 340, 410, 480].map((y) => <path key={y} d={`M0 ${y} L270 ${y + 18}`} />)}
          {[40, 100, 160, 220].map((x) => <path key={x} d={`M${x} 0 L${x + 30} 560`} />)}
        </g>
        <g stroke="#1b3040" strokeWidth="5" strokeLinecap="round">
          <path d="M-10 250 C 70 230, 150 290, 290 240" />
          <path d="M120 -10 C 140 140, 90 330, 150 570" />
        </g>
        <path d="M0 520 C 60 500, 100 540, 170 530 S 250 500, 270 520 L270 560 L0 560Z" fill="#0d2330" />
        {/* The whole route, dim; the part already driven is drawn over it in bright teal. */}
        <path data-route d={ROUTE} fill="none" stroke="#2dd4bf" strokeOpacity="0.25" strokeWidth="9" strokeLinecap="round" />
        <path
          data-travelled
          d={ROUTE}
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="0.38 1"
        />
        {STOPS.map(([x, y], i) => (
          <circle
            key={`${x}-${y}`}
            data-stop
            cx={x}
            cy={y}
            r="5"
            fill={STOP_FRACTIONS[i] <= REST.progress ? LIT : UNLIT}
            stroke="#5eead4"
            strokeWidth="2"
          />
        ))}
        <g data-marker transform={`translate(${REST.x} ${REST.y})`}>
          <circle r="16" fill="#2dd4bf" opacity="0.28" />
          <circle r="7" fill="#ecfeff" stroke="#0f766e" strokeWidth="3" />
        </g>
      </svg>

      <div className="absolute inset-x-3 top-9 z-10 flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-[10px] backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="font-medium">Morning Shuttle A</span>
        <span className="ml-auto text-white/50">Live</span>
      </div>

      <div className="absolute inset-x-3 bottom-3 z-10 rounded-2xl border border-white/10 bg-[#0c1b26]/90 p-3 backdrop-blur">
        <div className="flex items-end justify-between">
          <div>
            <p data-eta-label className="text-[9px] uppercase tracking-wider text-white/45">Arriving in</p>
            <p data-eta className="font-display text-2xl font-semibold leading-none">3 min</p>
          </div>
          <div className="text-right text-[9px] text-white/55">
            <p data-away>2 stops away</p>
            <p className="text-teal-300">On time</p>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
          <div data-bar className="h-full rounded-full bg-gradient-to-r from-teal-400 to-sky-300" style={{ width: '42%' }} />
        </div>
      </div>
    </div>
  );
}
