import {
  CHAPTERS,
  CONTENT_LENGTH,
  GLIDE,
  SIDE_X,
  contentStart,
  storyScreens,
} from './chapterMath';
import { CURTAIN_VARS, RECEDE, curtainScreens, curtainUnits, declareCurtain, sceneProgress } from './curtain';
import { EASE, gsap } from './motion/gsapSetup';
import { stepFromProgress } from './story';
import { playShot } from './screens/shot';
import { playPortal } from './screens/portal';

export const STORY_SCRUB = 1; // a long, soft lag behind the scroll: the swaps should feel weighty, not twitchy

const PHONE_PLAYERS = [playShot, playShot, playShot];

/**
 * "How it works" as one film, played by scrolling. The stage is pinned for STORY_SCREENS screens
 * and a single master timeline runs from 0 to CHAPTERS across them (then it stays pinned for the
 * curtain's length more, while the next section slides up over it). Chapter `c` owns [c, c + 1]:
 *
 *   - the device (a phone, then a laptop) rests on one side while its screen plays that chapter's
 *     scene -- a shuttle driving its route, a key being typed, riders joining, portal pages
 *     changing -- and the copy stands on the other side;
 *   - across each boundary the device glides to the opposite side, the old copy lifts away, the
 *     screen changes, and the new copy rises in from behind its masks;
 *   - at the last boundary the phone dissolves and a laptop takes its place.
 *
 * Must be called inside a gsap.context (see useGsapContext) so it is undone on unmount.
 * `detached` builds the same timeline without ScrollTrigger, paused, so it can be driven by hand.
 */
export function buildStoryFilm(section, stage, { onStep, detached = false, sideX = SIDE_X } = {}) {
  const q = gsap.utils.selector(section);
  const one = (selector) => q(selector)[0];

  const device = one('[data-device]');
  const phone = one('[data-phone]');
  const laptop = one('[data-laptop]');
  const screens = q('[data-screen]');
  const copies = q('[data-copy]');
  const segments = q('[data-seg]');
  const wordsOf = (copy) => copy.querySelectorAll('[data-tw]');
  const detailsOf = (copy) => copy.querySelectorAll('[data-eyebrow-c], [data-body-c]');

  const tl = gsap.timeline({
    defaults: { ease: EASE.linear },
    ...(detached
      ? { paused: true }
      : {
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => {
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            // The next section rises by exactly the curtain's length, so tell it how far.
            declareCurtain(section, CURTAIN_VARS.story, Math.round(vh * curtainScreens(vw)));
            return `+=${Math.round(vh * (storyScreens(vw) + curtainScreens(vw)))}`;
          },
          pin: stage,
          scrub: STORY_SCRUB,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          refreshPriority: 1, // measured after the hero's pin, before everything else (see Hero.jsx)
          // Scroll progress runs over the film AND the curtain; the chapter is read off the film's part.
          onUpdate: (self) => onStep?.(
            stepFromProgress(sceneProgress(self.progress, storyScreens(window.innerWidth), curtainScreens(window.innerWidth)), CHAPTERS),
          ),
        },
      }),
  });

  // Opening state: the first chapter's copy showing, every other one waiting.
  gsap.set(copies.slice(1), { opacity: 0 });
  gsap.set(device, { xPercent: sideX[0] });

  for (let chapter = 0; chapter < CHAPTERS; chapter += 1) {
    const edge = chapter + 1; // the boundary into the next chapter
    const start = contentStart(chapter);

    // What the device's screen does during this chapter.
    if (chapter < PHONE_PLAYERS.length) PHONE_PLAYERS[chapter](tl, screens[chapter], start, CONTENT_LENGTH);
    else playPortal(tl, laptop, start, CONTENT_LENGTH);

    // The chapter's own progress bar fills as it plays.
    tl.fromTo(segments[chapter], { scaleX: 0 }, { scaleX: 1, duration: 1 }, chapter);

    if (chapter === CHAPTERS - 1) break;

    // The device glides to the other side...
    tl.to(device, { xPercent: sideX[edge], ease: 'sine.inOut', duration: 2 * GLIDE }, edge - GLIDE);

    // ...the old copy lifts away and the new copy rises in from behind its masks.
    tl.to(copies[chapter], { opacity: 0, yPercent: -6, ease: 'power1.in', duration: GLIDE }, edge - GLIDE * 1.25)
      .set(copies[edge], { opacity: 1 }, edge)
      .fromTo(wordsOf(copies[edge]), { yPercent: 115 }, { yPercent: 0, ease: EASE.out, duration: 0.34, stagger: 0.06 }, edge)
      .fromTo(detailsOf(copies[edge]), { opacity: 0, y: 18 }, { opacity: 1, y: 0, ease: EASE.soft, duration: 0.3, stagger: 0.07 }, edge + 0.1);

    const toLaptop = chapter === PHONE_PLAYERS.length - 1;
    if (toLaptop) {
      // The phone dissolves and the laptop takes its place in the same spot.
      tl.to(phone, { opacity: 0, scale: 0.88, ease: 'sine.in', duration: GLIDE * 1.2 }, edge - GLIDE * 1.1)
        .fromTo(laptop, { opacity: 0, scale: 0.88 }, { opacity: 1, scale: 1, ease: 'sine.out', duration: GLIDE * 1.8 }, edge - GLIDE * 0.1);
    } else {
      // The screen changes while the phone is in motion, and the phone leans into the move.
      const lean = sideX[edge] > sideX[chapter] ? 1 : -1;
      tl.to(screens[chapter], { opacity: 0, scale: 0.96, ease: 'sine.inOut', duration: 2 * GLIDE }, edge - GLIDE)
        .fromTo(screens[edge], { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, ease: 'sine.inOut', duration: 2 * GLIDE }, edge - GLIDE)
        .to(phone, { rotation: lean * 8, ease: 'sine.out', duration: GLIDE }, edge - GLIDE)
        .to(phone, { rotation: 0, ease: 'sine.inOut', duration: GLIDE * 1.4 }, edge);
    }
  }

  // Hold the finished frame until the very end, so the film is exactly CHAPTERS long.
  tl.to({}, { duration: GLIDE }, CHAPTERS - GLIDE);

  // Then, as the next section slides up over the pinned stage, the stage recedes: a little smaller,
  // its corners rounding, and dimming. (A detached film is just the chapters.)
  if (!detached) {
    const units = curtainUnits(CHAPTERS, storyScreens(window.innerWidth), curtainScreens(window.innerWidth));
    tl.to(
      one('[data-curtain]'),
      { scale: RECEDE.scale, yPercent: RECEDE.yPercent, borderRadius: RECEDE.radius, transformOrigin: '50% 30%', ease: 'none', duration: units },
      CHAPTERS,
    ).fromTo(one('[data-shade]'), { opacity: 0 }, { opacity: RECEDE.shade, ease: 'none', duration: units }, CHAPTERS);
  }

  // The first chapter's copy rises in as the section arrives, before the pin takes hold.
  if (!detached && copies[0]) {
    const intro = { trigger: section, start: 'top 72%', toggleActions: 'play none none reverse' };
    gsap.fromTo(wordsOf(copies[0]), { yPercent: 115 }, { yPercent: 0, ease: EASE.out, duration: 1.1, stagger: 0.08, scrollTrigger: intro });
    gsap.fromTo(detailsOf(copies[0]), { opacity: 0, y: 18 }, { opacity: 1, y: 0, ease: EASE.soft, duration: 0.9, delay: 0.2, stagger: 0.08, scrollTrigger: intro });
  }

  return tl;
}
