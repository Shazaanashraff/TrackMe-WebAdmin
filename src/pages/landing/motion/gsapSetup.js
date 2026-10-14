import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// One place where GSAP is configured, so every landing component imports the
// same, already-registered instance. This module is only ever imported by the
// lazy landing chunk, so the portal never pays for GSAP.
//
// Licence: GSAP's standard "no charge" licence covers commercial websites
// (https://gsap.com/standard-license). It forbids building a competing no-code
// animation tool, which this is not. Lenis is MIT.

let configured = false;

export function setupGsap() {
  if (configured) return gsap;
  // jsdom (unit tests) has no matchMedia, which ScrollTrigger needs; nothing there scrolls anyway.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return gsap;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out', duration: 0.8 });
  configured = true;
  return gsap;
}

/** The easings the page uses, named by feel so choreography reads like a script. */
export const EASE = {
  out: 'expo.out', // fast start, long settle: things arriving
  inOut: 'expo.inOut', // big shape changes: the iris, the wipes
  soft: 'power2.out', // small, quiet movements
  linear: 'none', // anything driven directly by scroll position
};

// Register at import time, not later from a component's effect: a parent's effect runs AFTER its
// children's, so the hero and the story would build their ScrollTriggers before the plugin
// existed and every pinned scroll animation would silently do nothing (React's dev-only double
// effect hid this locally; a production build showed it).
setupGsap();

export { gsap, ScrollTrigger };
