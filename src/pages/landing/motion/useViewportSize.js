import { useEffect, useState } from 'react';

// On a phone the address bar slides away as you scroll, which changes `innerHeight` by
// 50-100px without any real change of layout. Re-measuring pinned scenes for that makes
// them jump, so small height changes are ignored; width changes always count.
const HEIGHT_TOLERANCE = 150;

const read = () => ({
  width: typeof window === 'undefined' ? 1440 : window.innerWidth,
  height: typeof window === 'undefined' ? 900 : window.innerHeight,
});

/** Decides whether a new viewport measurement is worth acting on. Pure, so it can be tested. */
export function meaningfulChange(previous, next, tolerance = HEIGHT_TOLERANCE) {
  return previous.width !== next.width || Math.abs(previous.height - next.height) > tolerance;
}

/** The viewport size, updated on resize but steady through address-bar wobble. */
export function useViewportSize() {
  const [size, setSize] = useState(read);

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next = read();
        setSize((previous) => (meaningfulChange(previous, next) ? next : previous));
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return size;
}
