import { useEffect, useState } from 'react';

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * False for `delayMs` after mount, so a chart can sit behind a skeleton and
 * then mount: recharts only plays its grow-in animation when the marks first
 * render, which makes this the "chart is loading" moment. With reduced motion
 * set (or `delayMs` of 0) it is ready immediately and the caller should also
 * switch the animation off.
 */
export function useChartReady(delayMs = 600) {
  const instant = delayMs === 0 || prefersReducedMotion();
  const [ready, setReady] = useState(instant);

  useEffect(() => {
    if (instant) return undefined;
    const id = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(id);
  }, [delayMs, instant]);

  return ready;
}
