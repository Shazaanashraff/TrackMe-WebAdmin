import { describe, it, expect } from 'vitest';
import { UPRIGHT_BELOW, coverGeometry, focusOnStage, pickClip, sceneShift } from '../heroVideo';
import { HERO_VIDEO } from '../config';
import { heroWindow } from '../roadScene';

const { wide, tall } = HERO_VIDEO;
const SCREENS = [
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [1024, 768],
  [820, 1100],
  [390, 844],
  [360, 640],
  [320, 640],
];

describe('the clips themselves', () => {
  it('are a wide HD cut and a portrait cut, each with its pictures and its own size', () => {
    [wide, tall].forEach((clip) => {
      expect(clip.src).toMatch(/\.mp4$/);
      expect(clip.poster).toMatch(/\.webp$/);
      expect(clip.still).toMatch(/\.webp$/);
      expect(clip.focus.x).toBeGreaterThan(0);
      expect(clip.focus.x).toBeLessThan(1);
      expect(clip.focus.y).toBeGreaterThan(0);
      expect(clip.focus.y).toBeLessThan(1);
    });
    expect(wide.width).toBeGreaterThanOrEqual(1920); // full HD
    expect(wide.width / wide.height).toBeCloseTo(16 / 9, 2);
    expect(tall.width / tall.height).toBeCloseTo(9 / 16, 2);
    expect(tall.height).toBeGreaterThanOrEqual(1280); // HD in portrait
  });
});

describe('coverGeometry', () => {
  it('scales the clip until it covers the stage, then centres it', () => {
    const box = coverGeometry(1440, 900, wide.width, wide.height); // a 16:10 stage is taller than 16:9
    expect(box.scale).toBeCloseTo(900 / 1080);
    expect(box.width).toBeCloseTo(1600);
    expect(box.height).toBeCloseTo(900);
    expect(box.left).toBeCloseTo(-80);
    expect(box.top).toBeCloseTo(0);
  });

  it('crops the sides on a phone and the top and bottom on an ultra-wide screen', () => {
    const phone = coverGeometry(390, 844, wide.width, wide.height);
    expect(phone.height).toBeCloseTo(844);
    expect(phone.left).toBeLessThan(-500);

    const ultra = coverGeometry(2560, 1080, wide.width, wide.height);
    expect(ultra.width).toBeCloseTo(2560);
    expect(ultra.top).toBeLessThan(0);
  });

  it.each(SCREENS)('always covers the whole stage at %sx%s, with the clip chosen for that screen', (w, h) => {
    const clip = pickClip(HERO_VIDEO, w, h);
    const box = coverGeometry(w, h, clip.width, clip.height);
    expect(box.left).toBeLessThanOrEqual(0.001);
    expect(box.top).toBeLessThanOrEqual(0.001);
    expect(box.left + box.width).toBeGreaterThanOrEqual(w - 0.001);
    expect(box.top + box.height).toBeGreaterThanOrEqual(h - 0.001);
  });

  it('barely crops the portrait clip on a phone, so little of the footage is thrown away', () => {
    const box = coverGeometry(390, 844, tall.width, tall.height);
    expect(box.width / 390).toBeLessThan(1.3); // against ~3.8x for the wide clip
    expect(coverGeometry(390, 844, wide.width, wide.height).width / 390).toBeGreaterThan(3);
  });
});

describe('focusOnStage', () => {
  it("places the clip's subject where it lands once the clip covers the stage", () => {
    const focus = focusOnStage(1440, 900, wide);
    expect(focus.x).toBeCloseTo(-80 + 0.27 * 1600);
    expect(focus.y).toBeCloseTo(0.53 * 900);
  });

  it('can land off screen on a phone, where the wide clip is cropped', () => {
    expect(focusOnStage(390, 844, wide).x).toBeLessThan(0);
  });

  it('keeps the portrait clip\'s subject on screen on a phone', () => {
    const focus = focusOnStage(390, 844, tall);
    expect(focus.x).toBeGreaterThan(0);
    expect(focus.x).toBeLessThan(390);
  });
});

describe('sceneShift', () => {
  const START = 0.72;

  it('is nothing when there is no clip', () => {
    expect(sceneShift(1440, 900, heroWindow(1440, 900), null)).toEqual({ x: 0, y: 0 });
  });

  it.each(SCREENS)("puts the clip's subject under the opening window at %sx%s", (w, h) => {
    const clip = pickClip(HERO_VIDEO, w, h);
    const spec = heroWindow(w, h);
    const shift = sceneShift(w, h, spec, clip, 1);
    const focus = focusOnStage(w, h, clip);

    // Where the subject ends up once the scene is slid: at, or as near as the clip's own edges
    // allow to, the centre of the window.
    expect(Math.abs(focus.x + shift.x - spec.x)).toBeLessThan(spec.r0);
    expect(Math.abs(focus.y + shift.y - spec.y)).toBeLessThan(spec.r0);
  });

  it.each(SCREENS)("never lets the clip's own edge into the window at %sx%s", (w, h) => {
    const clip = pickClip(HERO_VIDEO, w, h);
    const spec = heroWindow(w, h);
    [1, START].forEach((scale) => {
      const shift = sceneShift(w, h, spec, clip, scale);
      const box = coverGeometry(w, h, clip.width, clip.height);
      // The clip as it looks at the start: zoomed about the window's centre, then slid.
      const at = (point, centre, offset) => centre + offset + scale * (point - centre);
      const left = at(box.left, spec.x, shift.x);
      const right = at(box.left + box.width, spec.x, shift.x);
      const top = at(box.top, spec.y, shift.y);
      const bottom = at(box.top + box.height, spec.y, shift.y);

      expect(left).toBeLessThanOrEqual(spec.x - spec.r0 + 0.01);
      expect(right).toBeGreaterThanOrEqual(spec.x + spec.r0 - 0.01);
      expect(top).toBeLessThanOrEqual(spec.y - spec.r0 + 0.01);
      expect(bottom).toBeGreaterThanOrEqual(spec.y + spec.r0 - 0.01);
    });
  });

  it('slides the portrait clip up on a phone, to bring the bus into the window above the headline', () => {
    const spec = heroWindow(390, 844, 330);
    const shift = sceneShift(390, 844, spec, tall, 1);
    expect(shift.y).toBeLessThan(-100);
    expect(Math.abs(shift.x)).toBeLessThan(100); // the bus is already about centred sideways
  });

  it('slides the wide clip right on a wide screen, to put the bus under the window at the right', () => {
    const spec = heroWindow(1440, 900);
    expect(sceneShift(1440, 900, spec, wide, 1).x).toBeGreaterThan(300);
  });

  it('slides a zoomed-out start less, because zooming already pulls the scene in', () => {
    const spec = heroWindow(1440, 900);
    const full = sceneShift(1440, 900, spec, wide, 1);
    const zoomed = sceneShift(1440, 900, spec, wide, START);
    expect(Math.abs(zoomed.x)).toBeLessThan(Math.abs(full.x));
  });
});

describe('pickClip', () => {
  it('gives the portrait cut to an upright phone and the wide cut to everything else', () => {
    expect(pickClip(HERO_VIDEO, 390, 844)).toBe(tall);
    expect(pickClip(HERO_VIDEO, 320, 640)).toBe(tall);
    expect(pickClip(HERO_VIDEO, 1440, 900)).toBe(wide);
    expect(pickClip(HERO_VIDEO, 1920, 1080)).toBe(wide);
    expect(pickClip(HERO_VIDEO, 844, 390)).toBe(wide); // a phone on its side
    expect(pickClip(HERO_VIDEO, 1024, 768)).toBe(wide);
  });

  it('decides by the screen\'s shape, so an upright tablet gets the portrait cut too', () => {
    expect(pickClip(HERO_VIDEO, 768, 1024)).toBe(tall);
    expect(pickClip(HERO_VIDEO, 820, 1180)).toBe(tall);
  });

  it(`switches at a width-to-height ratio of ${UPRIGHT_BELOW}, and a square-ish window is not upright`, () => {
    expect(pickClip(HERO_VIDEO, 799, 1000)).toBe(tall);
    expect(pickClip(HERO_VIDEO, 800, 1000)).toBe(wide);
    expect(pickClip(HERO_VIDEO, 900, 900)).toBe(wide);
  });

  it('falls back to the wide cut when there is no portrait one, and to nothing without a clip', () => {
    expect(pickClip({ wide }, 390, 844)).toBe(wide);
    expect(pickClip(null, 390, 844)).toBeNull();
  });

  it('copes with a screen of no height yet (it is measured a moment after first render)', () => {
    expect(pickClip(HERO_VIDEO, 390, 0)).toBe(wide);
  });
});
