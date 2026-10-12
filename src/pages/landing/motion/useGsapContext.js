import { useEffect } from 'react';
import { gsap } from './gsapSetup';

/**
 * Run GSAP animation code for the life of a component, and undo all of it on
 * unmount: tweens, timelines and ScrollTriggers created inside `setup` are
 * reverted together. Pass a ref as `scope` so string selectors inside `setup`
 * only match within that element.
 *
 *   useGsapContext(() => { gsap.from('.title', { y: 40 }); }, [], rootRef);
 */
export function useGsapContext(setup, deps = [], scope) {
  useEffect(() => {
    const ctx = gsap.context(setup, scope && scope.current ? scope.current : undefined);
    return () => ctx.revert();
    // The caller owns `deps`; `setup` is intentionally not one of them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
