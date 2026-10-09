import { useEffect, useState } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ETA_START, formatEta, nextEta } from './eta';

/**
 * "Right here. 3:41 to your stop." A countdown that ticks while the hero is on
 * screen, standing in for the live arrival time riders see in the app. With
 * reduced motion it holds still on a calm "4 min" instead of ticking.
 */
export function LiveEta() {
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [seconds, setSeconds] = useState(ETA_START);

  useEffect(() => {
    if (reduce) return undefined;
    const id = setInterval(() => setSeconds(nextEta), 1000);
    return () => clearInterval(id);
  }, [reduce]);

  const arrived = !reduce && seconds <= 0;

  return (
    <p
      className="inline-flex items-center gap-3 rounded-full border border-l-bone/25 bg-black/30 py-2 pl-3 pr-5 text-sm text-l-bone backdrop-blur-sm"
      aria-label={reduce ? 'Right here, 4 minutes from your stop' : undefined}
    >
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span
          className="absolute inline-flex h-full w-full rounded-full bg-l-teal opacity-70"
          style={{ animation: 'l-ping 1.8s ease-out infinite' }}
        />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-l-teal" />
      </span>
      <span className="font-medium">Right here.</span>
      <span className="font-mono tabular-nums text-l-teal" aria-hidden={!reduce}>
        {reduce ? '4 min' : formatEta(seconds)}
      </span>
      <span className="text-l-bone/60">{arrived ? 'shuttle at your stop' : 'to your stop'}</span>
    </p>
  );
}
