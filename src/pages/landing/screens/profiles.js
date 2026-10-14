import { profileEtaMinutes } from '../chapterMath';
import { scrubbed, setText } from './play';

// The managed-profiles screen, as a scene: what ProfilesScreen.jsx draws, and how scrolling plays it.

/** Draw the shuttle card `progress` (0..1) of the way through: six minutes out, closing in. */
export function paintProfiles(root, progress) {
  setText(root.querySelector('[data-profile-eta]'), `${profileEtaMinutes(progress)} min`);
  const bar = root.querySelector('[data-profile-bar]');
  if (bar) bar.style.width = `${Math.round(12 + progress * 80)}%`;
}

/** Riders join the list one by one, then the second rider's shuttle closes in. */
export function playProfiles(tl, root, at, span) {
  const riders = root.querySelectorAll('[data-rider]');
  const add = root.querySelector('[data-add]');
  const shuttle = root.querySelector('[data-shuttle]');

  tl.fromTo(riders, { opacity: 0, y: 18 }, { opacity: 1, y: 0, ease: 'power2.out', duration: span * 0.16, stagger: span * 0.16 }, at + span * 0.02);
  if (add) tl.fromTo(add, { opacity: 0 }, { opacity: 1, ease: 'power2.out', duration: span * 0.12 }, at + span * 0.52);
  if (shuttle) tl.fromTo(shuttle, { opacity: 0, y: 24 }, { opacity: 1, y: 0, ease: 'power2.out', duration: span * 0.16 }, at + span * 0.6);

  // The countdown starts as the card arrives and runs to the end of the chapter.
  scrubbed(tl, at + span * 0.6, span * 0.4, (progress) => paintProfiles(root, progress));
}
