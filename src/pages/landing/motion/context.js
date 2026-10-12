import { createContext, useContext } from 'react';

// What the landing page's motion layer shares with the components under it.
// Kept apart from MotionProvider.jsx so that file only exports a component.

export const MotionContext = createContext({
  lenis: null, // the smooth-scroll instance, or null (reduced motion, touch-free environments)
  reduced: true, // true when animation should be skipped or calmed
  canAnimate: false,
  scrollTo: () => {},
});

export function useMotion() {
  return useContext(MotionContext);
}

/** True where animation can run at all (a real browser, not jsdom or a very old one). */
export const browserCanAnimate = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';
