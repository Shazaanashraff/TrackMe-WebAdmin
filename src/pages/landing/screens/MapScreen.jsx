// Illustrative rider "live map" screen. Generic sample content, not real data.
const ROUTE = 'M34 470 C 70 400, 46 340, 112 306 S 214 250, 196 178 S 150 110, 210 64';
const STOPS = [[34, 470], [112, 306], [196, 178], [210, 64]];

export default function MapScreen() {
  return (
    <div className="absolute inset-0 text-white">
      <svg viewBox="0 0 270 560" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect width="270" height="560" fill="#0a1519" />
        <g stroke="#14262b" strokeWidth="1">
          {[60, 130, 200, 270, 340, 410, 480].map((y) => <path key={y} d={`M0 ${y} L270 ${y + 18}`} />)}
          {[40, 100, 160, 220].map((x) => <path key={x} d={`M${x} 0 L${x + 30} 560`} />)}
        </g>
        <g stroke="#1b343a" strokeWidth="5" strokeLinecap="round">
          <path d="M-10 250 C 70 230, 150 290, 290 240" />
          <path d="M120 -10 C 140 140, 90 330, 150 570" />
        </g>
        <path d="M0 520 C 60 500, 100 540, 170 530 S 250 500, 270 520 L270 560 L0 560Z" fill="#0d2229" />
        <path d={ROUTE} fill="none" stroke="#2dd4bf" strokeOpacity="0.25" strokeWidth="9" strokeLinecap="round" />
        <path id="mapscreen-route" d={ROUTE} fill="none" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" />
        {STOPS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#0a1519" stroke="#5eead4" strokeWidth="2" />
        ))}
        <g>
          <circle r="16" fill="#2dd4bf" opacity="0.28">
            <animateMotion dur="14s" repeatCount="indefinite" rotate="auto"><mpath href="#mapscreen-route" /></animateMotion>
          </circle>
          <circle r="7" fill="#ecfeff" stroke="#0f766e" strokeWidth="3">
            <animateMotion dur="14s" repeatCount="indefinite"><mpath href="#mapscreen-route" /></animateMotion>
          </circle>
        </g>
      </svg>

      <div className="absolute inset-x-3 top-9 z-10 flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-[10px] backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="font-medium">Morning Shuttle A</span>
        <span className="ml-auto text-white/50">Live</span>
      </div>

      <div className="absolute inset-x-3 bottom-3 z-10 rounded-2xl border border-white/10 bg-[#0c1a1f]/90 p-3 backdrop-blur">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-white/45">Arriving in</p>
            <p className="font-display text-2xl font-semibold leading-none">4 min</p>
          </div>
          <div className="text-right text-[9px] text-white/55">
            <p>2 stops away</p>
            <p className="text-teal-300">On time</p>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-teal-400 to-sky-300" />
        </div>
      </div>
    </div>
  );
}
