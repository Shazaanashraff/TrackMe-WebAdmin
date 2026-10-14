import { useEffect, useRef } from 'react';
import { hasFinePointer, useMotion } from './motion/context';
import { gsap } from './motion/gsapSetup';

// What the ring grows over: anything you can press or type into.
const INTERACTIVE = 'a, button, input, textarea, select, summary, [role="button"], [data-cursor]';

/**
 * A small detail for visitors with a mouse: a ring that trails the pointer and swells over anything
 * you can press, with a dot that stays exactly under it. The real cursor is never hidden, so
 * nothing is lost if this does not run. It renders nothing on touch screens, for reduced motion,
 * or where animation is unavailable, and it never takes a click (pointer-events: none).
 */
export function Cursor() {
  const { reduced, canAnimate } = useMotion();
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const enabled = canAnimate && !reduced && hasFinePointer();

  useEffect(() => {
    if (!enabled) return undefined;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return undefined;

    gsap.set([ring, dot], { xPercent: -50, yPercent: -50, x: -100, y: -100 });
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });
    const dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'none' });
    const dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'none' });

    const show = (on) => {
      ring.dataset.visible = on ? 'true' : 'false';
      dot.dataset.visible = on ? 'true' : 'false';
    };
    const move = (event) => {
      show(true);
      ringX(event.clientX);
      ringY(event.clientY);
      dotX(event.clientX);
      dotY(event.clientY);
      const over = event.target instanceof Element && event.target.closest(INTERACTIVE);
      ring.dataset.active = over ? 'true' : 'false';
      dot.dataset.active = over ? 'true' : 'false';
    };
    const leave = () => show(false);

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      gsap.killTweensOf([ring, dot]);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[70]">
      <span ref={ringRef} data-cursor-ring data-visible="false" data-active="false" className="l-cursor-ring" />
      <span ref={dotRef} data-cursor-dot data-visible="false" data-active="false" className="l-cursor-dot" />
    </div>
  );
}
