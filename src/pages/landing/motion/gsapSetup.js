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

export { gsap, ScrollTrigger };
