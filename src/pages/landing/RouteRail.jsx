import { useEffect, useRef, useState } from 'react';
import { Bus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STOPS, activeStop, journeyProgress, stopFractions } from './journey';

const CHIP_MS = 1800;

/**
 * The page as a route. A line along the left edge fills as you scroll, a tiny
 * shuttle rides its tip, and each section is a stop that lights up when the
 * shuttle reaches it. It is decoration only (aria-hidden, no pointer events),
 * so it can never block a tap or be read out as content.
 */
export function RouteRail() {
  const [state, setState] = useState({ progress: 0, fractions: STOPS.map(() => 0) });
  const [chip, setChip] = useState(null);
  const lastStop = useRef(0);
  const chipTimer = useRef(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const height = document.documentElement.scrollHeight;
      const tops = STOPS.map(({ id }) => {
        const el = document.getElementById(id);
        return el ? el.getBoundingClientRect().top + window.scrollY : 0;
      });
      const progress = journeyProgress(window.scrollY, height, viewport);
      const fractions = stopFractions(tops, height, viewport);
      setState({ progress, fractions });

      // Name the stop for a moment when the shuttle arrives at a new one.
      const current = activeStop(progress, fractions);
      if (current !== lastStop.current) {
        lastStop.current = current;
        if (current > 0) {
          setChip(STOPS[current].label);
          window.clearTimeout(chipTimer.current);
          chipTimer.current = window.setTimeout(() => setChip(null), CHIP_MS);
        } else {
          setChip(null);
        }
      }
    };

    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    // Images and fonts settle after first paint and move the sections.
    const settle = window.setTimeout(schedule, 800);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('load', schedule);
      window.clearTimeout(settle);
      window.clearTimeout(chipTimer.current);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const { progress, fractions } = state;
  const current = activeStop(progress, fractions);
  const arrived = progress > 0.985;

  return (
    <div
      aria-hidden="true"
      data-progress={progress.toFixed(3)}
      data-stop={current}
      className={cn(
        'pointer-events-none fixed bottom-40 left-0.5 top-24 z-40 w-3 transition-opacity duration-500 sm:left-3.5',
        progress > 0.01 ? 'opacity-100' : 'opacity-0',
      )}
    >
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
      <span
        className="absolute left-1/2 top-0 w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-teal-300/0 via-teal-300 to-sky-300"
        style={{ height: `${progress * 100}%` }}
      />

      {STOPS.slice(1).map((stop, i) => {
        const index = i + 1;
        const reached = index <= current;
        return (
          <span
            key={stop.id}
            data-reached={reached}
            className={cn(
              'absolute left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors duration-500',
              reached ? 'border-teal-300 bg-teal-300' : 'border-white/25 bg-[#04090b]',
            )}
            style={{ top: `${fractions[index] * 100}%` }}
          />
        );
      })}

      <span
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ top: `${progress * 100}%` }}
      >
        {arrived ? (
          <span
            className="absolute inset-0 rounded-full bg-teal-300/60"
            style={{ animation: 'l-ping 1.6s ease-out infinite' }}
          />
        ) : null}
        <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-teal-300 text-[#04211d] shadow-[0_0_18px_rgb(45_212_191/0.8)] sm:h-6 sm:w-6">
          <Bus className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
        </span>
        <span
          className={cn(
            'l-glass absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-teal-100 transition-opacity duration-500 sm:left-9',
            chip ? 'opacity-100' : 'opacity-0',
          )}
        >
          {chip}
        </span>
      </span>
    </div>
  );
}
