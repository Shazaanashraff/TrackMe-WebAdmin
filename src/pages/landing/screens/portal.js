// The manager portal, as a scene: what PortalScreen.jsx shows, and how scrolling plays it.

/** The shots change as the visitor scrolls; the last one, the queue, ends with a request approved. */
export function playPortal(tl, root, at, span) {
  const shots = root.querySelectorAll('[data-shot]');
  const pan = root.querySelector('[data-portal-pan]');
  const toast = root.querySelector('[data-toast]');
  const slice = span / Math.max(1, shots.length);

  // Each shot sits on top of the one before it, so it only has to fade in over it.
  shots.forEach((shot, i) => {
    if (i === 0) return;
    tl.fromTo(shot, { opacity: 0 }, { opacity: 1, ease: 'power1.inOut', duration: slice * 0.35 }, at + slice * i - slice * 0.15);
  });
  // A slow push in across the whole chapter keeps the screen alive between changes.
  if (pan) tl.fromTo(pan, { scale: 1 }, { scale: 1.07, ease: 'none', duration: span, transformOrigin: '50% 0%' }, at);
  if (toast) {
    tl.fromTo(toast, { opacity: 0, y: 14 }, { opacity: 1, y: 0, ease: 'power2.out', duration: slice * 0.3 }, at + slice * (shots.length - 1) + slice * 0.3);
  }
}
