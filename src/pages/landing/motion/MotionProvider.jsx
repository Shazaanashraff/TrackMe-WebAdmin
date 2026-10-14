import { useCallback, useEffect, useMemo, useState } from 'react';
import Lenis from 'lenis';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ScrollTrigger, gsap, setupGsap } from './gsapSetup';
import { MotionContext, browserCanAnimate } from './context';

// Easing for programmatic scrolls (nav links): a quick start and a long, calm landing.
const scrollEase = (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

/**
 * Smooth, inertial scrolling for the landing page, wired into GSAP so
 * scroll-driven animation stays in step with it.
 *
 * - Visitors who prefer reduced motion, and environments that cannot animate,
 *   get the browser's own scrolling and no Lenis at all.
 * - Touch devices keep native scrolling too (Lenis's default): a finger already
 *   has its own momentum, and fighting it feels wrong.
 * - Nav links such as `#join` are glided to with the same smoothing.
 */
export function MotionProvider({ children }) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const canAnimate = browserCanAnimate();
  const [lenis, setLenis] = useState(null);

  useEffect(() => {
    if (reduced || !canAnimate) return undefined;

    setupGsap();
    const instance = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
    // Lenis scrolls the real window, so ScrollTrigger keeps working; it only needs to be told when.
    instance.on('scroll', ScrollTrigger.update);
    // A pinned scene adds scroll distance when ScrollTrigger measures it, which can be after
    // Lenis took its own measurement. Without this Lenis believes the page is shorter than it
    // is: glides stop short and the bottom of the page cannot be reached.
    const onRefresh = () => instance.resize();
    ScrollTrigger.addEventListener('refresh', onRefresh);
    const tick = (time) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);

    return () => {
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      gsap.ticker.remove(tick);
      instance.destroy();
      setLenis(null);
    };
  }, [reduced, canAnimate]);

  // Glide to in-page anchors instead of jumping.
  useEffect(() => {
    if (!lenis) return undefined;
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = event.target.closest?.('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute('href');
      const target = hash.length > 1 ? document.querySelector(hash) : null;
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { duration: 1.6, easing: scrollEase });
      window.history.replaceState(null, '', hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [lenis]);

  const scrollTo = useCallback(
    (target, options) => {
      if (lenis) lenis.scrollTo(target, { easing: scrollEase, ...options });
      else if (typeof target === 'number') window.scrollTo({ top: target });
      else target?.scrollIntoView?.();
    },
    [lenis],
  );

  const value = useMemo(
    () => ({ lenis, reduced: reduced || !canAnimate, canAnimate, scrollTo }),
    [lenis, reduced, canAnimate, scrollTo],
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}
