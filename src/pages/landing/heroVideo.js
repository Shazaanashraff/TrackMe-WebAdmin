// The geometry of the hero's film clip, kept apart from the component so it can be unit-tested.
//
// The clip fills the stage the way `object-fit: cover` does (scaled until it covers, the overflow
// cropped evenly). The opening shows it through a small round window on the right of the screen, so
// at the start the scene is slid sideways until the clip's own subject (the bus, small and far away
// at the junction) sits under that window; as the window opens the scene slides back to its natural
// place and the whole frame is revealed.

/**
 * A clip is `{ src, poster, still, width, height, focus }`: the file, the picture shown while it
 * loads, the still used instead of it for reduced motion, its own size, and where its subject is
 * at the start (a 0..1 point in its frame).
 */

/** How a clip of `videoW x videoH` is scaled and cropped to cover a `stageW x stageH` stage. */
export function coverGeometry(stageW, stageH, videoW, videoH) {
  const scale = Math.max(stageW / videoW, stageH / videoH);
  const width = videoW * scale;
  const height = videoH * scale;
  return { scale, width, height, left: (stageW - width) / 2, top: (stageH - height) / 2 };
}

/** Where the clip's subject (a 0..1 point in its frame) lands on the stage once the clip covers it. */
export function focusOnStage(stageW, stageH, clip) {
  const cover = coverGeometry(stageW, stageH, clip.width, clip.height);
  return {
    x: cover.left + clip.focus.x * cover.width,
    y: cover.top + clip.focus.y * cover.height,
  };
}

/** One axis of the slide: as far as wanted, but never so far that the clip's edge enters the window. */
function slide(wanted, centre, radius, low, high, startScale) {
  const max = startScale * (centre - low) - radius; // the clip's low edge stays beyond the window's
  const min = radius - startScale * (high - centre); // and so does its high edge
  return Math.min(Math.max(wanted, min), max);
}

/**
 * How far to slide the scene, in pixels, so the clip's subject sits under the opening window.
 *
 * The scene is also zoomed to `startScale` about the window's centre at the start, which moves
 * everything towards (or away from) the centre, so the slide is scaled to match. It is never so
 * far that the clip's own edge enters the window: the scene must still cover the whole circle.
 */
export function sceneShift(stageW, stageH, spec, clip, startScale = 1) {
  if (!clip) return { x: 0, y: 0 };
  const cover = coverGeometry(stageW, stageH, clip.width, clip.height);
  const focus = focusOnStage(stageW, stageH, clip);
  return {
    x: slide(startScale * (spec.x - focus.x), spec.x, spec.r0, cover.left, cover.left + cover.width, startScale),
    y: slide(startScale * (spec.y - focus.y), spec.y, spec.r0, cover.top, cover.top + cover.height, startScale),
  };
}

/** A screen narrower than this (width over height) is "upright": a phone held the usual way. */
export const UPRIGHT_BELOW = 0.8;

/**
 * Which clip to play. An upright screen gets the tall one, cut from the same footage as a portrait
 * frame that follows the bus, so a phone shows a sharp picture instead of a thin slice of a wide
 * one stretched to fit. Everything else (desktop, laptop, a phone on its side) gets the wide one.
 */
export function pickClip(video, viewportWidth, viewportHeight) {
  if (!video) return null;
  const upright = viewportHeight > 0 && viewportWidth / viewportHeight < UPRIGHT_BELOW;
  return upright && video.tall ? video.tall : video.wide;
}
