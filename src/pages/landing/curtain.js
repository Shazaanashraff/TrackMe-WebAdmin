// The "curtain": a pinned scene stays where it is for one more stretch of scrolling while the next
// section slides up over it, instead of scrolling away with it. The pinned scene recedes (it
// shrinks a little, rounds its corners and dims) as it is covered.
//
// How it is built: the scene's pin is made longer by the curtain's length, and the next section
// pulls itself up by exactly that much (a negative top margin) so it starts under the pinned scene
// and rises over it. These are the pure parts: how long it is, how a scroll position splits into
// "the scene is playing" and "the scene is being covered", and the CSS variable that carries the
// length to the next section.

/** Screens of extra scrolling the curtain takes: a phone gets a little less. */
export const CURTAIN_SCREENS = { wide: 1, phone: 0.8 };
const PHONE_WIDTH = 768;
export const curtainScreens = (width) => (width < PHONE_WIDTH ? CURTAIN_SCREENS.phone : CURTAIN_SCREENS.wide);

/**
 * How many timeline units the curtain takes when the scene itself plays for `sceneUnits` units over
 * `sceneScreens` screens of scroll, so that one screen of scroll is the same number of units before
 * and during the curtain.
 */
export const curtainUnits = (sceneUnits, sceneScreens, curtain) => (sceneUnits * curtain) / sceneScreens;

/**
 * Where the scene is (0 = just pinned, 1 = finished playing) for a scroll progress over the whole
 * pin, which is the scene's screens plus the curtain's.
 */
export const sceneProgress = (progress, sceneScreens, curtain) =>
  Math.min(1, (Math.max(0, progress) * (sceneScreens + curtain)) / sceneScreens);

/** The CSS variables the next sections read to pull themselves up over a pinned scene. */
export const CURTAIN_VARS = { hero: '--l-curtain-hero', story: '--l-curtain-story' };

/** Say how far (in px) the section after `section` must rise; it reads `name` from `.landing`. */
export function declareCurtain(section, name, pixels) {
  const root = section?.closest?.('.landing');
  if (root) root.style.setProperty(name, `${pixels}px`);
}

/** Forget a curtain length: the scene it belonged to is no longer pinned. */
export function clearCurtain(section, name) {
  section?.closest?.('.landing')?.style.removeProperty(name);
}

/** The inline style a section uses to rise over the pinned scene before it. */
export const risesOver = (name) => ({ marginTop: `calc(var(${name}, 0px) * -1)` });

/** What the covered scene does while the next section slides over it. */
export const RECEDE = { scale: 0.92, yPercent: -3, radius: 28, shade: 0.72 };
