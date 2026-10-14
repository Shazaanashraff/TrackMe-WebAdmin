import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hero, HERO_SCROLL_SCREENS, HERO_SCRUB, HERO_START_SCALE, HERO_VIDEO_PUSH } from '../Hero';
import { HERO_VIDEO } from '../config';
import { curtainScreens } from '../curtain';
import { heroScreens } from '../roadScene';
import { MotionContext } from '../motion/context';
import { heroWindow } from '../roadScene';
import { gsap } from '../motion/gsapSetup';

// A GSAP stand-in that records the timeline instead of running it.
vi.mock('../motion/gsapSetup', () => {
  const calls = [];
  const drops = [];
  const timeline = {};
  ['fromTo', 'to', 'set', 'from'].forEach((method) => {
    timeline[method] = vi.fn((...args) => { calls.push({ method, args }); return timeline; });
  });
  return {
    EASE: { out: 'expo.out', inOut: 'expo.inOut', soft: 'power2.out', linear: 'none' },
    ScrollTrigger: { refresh: vi.fn() },
    gsap: {
      context: vi.fn((fn) => { fn(); return { revert: vi.fn() }; }),
      fromTo: vi.fn((...args) => { drops.push(args); }),
      timeline: vi.fn((vars) => { timeline.vars = vars; return timeline; }),
      ticker: { add: vi.fn(), remove: vi.fn() },
    },
    __calls: calls,
    __drops: drops,
    __timeline: timeline,
  };
});

import * as setup from '../motion/gsapSetup';

// With no film clip by default: the coded night road, which most of these cases are about.
const renderHero = ({ reduced, video = null, ready = true }) => render(
  <MotionContext.Provider value={{ lenis: null, reduced, canAnimate: !reduced, scrollTo: () => {} }}>
    <Hero video={video} ready={ready} />
  </MotionContext.Provider>,
);

const stage = (container) => container.querySelector('[data-hero-state]');
const spec = () => heroWindow(window.innerWidth, window.innerHeight);

beforeEach(() => {
  vi.clearAllMocks();
  setup.__calls.length = 0;
  setup.__drops.length = 0;
});

describe('Hero (the finished frame, for reduced motion)', () => {
  it('shows the finished frame at once: no word to open, no drop, no scroll film', () => {
    const { container } = renderHero({ reduced: true });

    expect(stage(container)).toHaveAttribute('data-hero-state', 'static'); // the stylesheet drops the word's mask for this state
    expect(stage(container).style.getPropertyValue('--dy')).toBe('0vh'); // nothing waiting above the screen
    expect(gsap.timeline).not.toHaveBeenCalled();
    expect(setup.__drops).toHaveLength(0);
    expect(container.querySelector('[data-cta]').style.opacity).toBe('1');
  });

  it('shows the answer, with the question kept small above it', () => {
    const { container } = renderHero({ reduced: true });

    expect(container.querySelector('[data-a]').style.opacity).toBe('1');
    expect(container.querySelector('[data-eyebrow]').style.opacity).toBe('1');
  });

  it('still has the whole exchange for a screen reader: question and answer, in order', () => {
    renderHero({ reduced: true });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/where.s the shuttle\?\s*right\s*here\./i);
  });

  it('keeps both buttons available without any scrolling', () => {
    renderHero({ reduced: true });
    expect(screen.getByRole('link', { name: /i'm a rider/i })).toHaveAttribute('href', '#join');
    expect(screen.getByRole('link', { name: /i'm a driver/i })).toHaveAttribute('href', '#join');
  });
});

describe('Hero (the scroll film)', () => {
  it('starts as the word PINGO waiting above the screen, with every word and button still hidden', () => {
    const { container } = renderHero({ reduced: false });

    expect(stage(container)).toHaveAttribute('data-hero-state', 'scrubbed');
    expect(stage(container).style.getPropertyValue('--ws')).toBe('1'); // the word at its resting size
    expect(stage(container).style.getPropertyValue('--wc')).toBe('0px'); // no circle of film yet
    expect(stage(container).style.getPropertyValue('--dy')).toBe('-120vh'); // above the screen, about to drop
    expect(container.querySelector('[data-q]').style.opacity).toBe('0');
    expect(container.querySelector('[data-cta]').style.opacity).toBe('0');
    expect(container.querySelector('[data-ticker]').style.opacity).toBe('0');
    expect(container.querySelector('[data-a]').style.opacity).toBe('0');
    expect(container.querySelector('[data-eyebrow]').style.opacity).toBe('0');
  });

  it('pins the stage and scrubs the film with scroll, measured again on every refresh', () => {
    const { container } = renderHero({ reduced: false });
    const trigger = gsap.timeline.mock.calls[0][0].scrollTrigger;

    expect(trigger.pin).toBe(stage(container));
    expect(trigger.scrub).toBe(HERO_SCRUB);
    expect(trigger.start).toBe('top top');
    expect(trigger.invalidateOnRefresh).toBe(true);
    // The film, then the curtain: the stage stays pinned while the next section slides up over it.
    const { innerWidth, innerHeight } = window;
    expect(heroScreens(innerWidth)).toBe(HERO_SCROLL_SCREENS);
    expect(trigger.end()).toBe(`+=${Math.round(innerHeight * (HERO_SCROLL_SCREENS + curtainScreens(innerWidth)))}`);
  });

  it('is measured before every other pin, because the story below depends on its length', () => {
    renderHero({ reduced: false });
    expect(gsap.timeline.mock.calls[0][0].scrollTrigger.refreshPriority).toBe(2);
  });

  it('grows the word, then opens a circle of film from the middle while the letters are still readable', () => {
    renderHero({ reduced: false });
    const win = spec();
    const word = setup.__calls.find((c) => c.method === 'fromTo' && c.args[1]?.['--ws'] !== undefined);
    const circle = setup.__calls.find((c) => c.method === 'fromTo' && c.args[1]?.['--wc'] !== undefined);

    expect(word.args[1]['--ws']).toBe(1);
    expect(word.args[2]['--ws']).toBeGreaterThan(3); // the letters grow past the edges
    expect(word.args[3]).toBe(0); // it starts the moment the film does
    expect(circle.args[1]['--wc']).toBe('0px');
    expect(circle.args[2]['--wc']).toBe(`${win.rFull}px`); // large enough to cover every corner
    expect(circle.args[3]).toBeGreaterThan(0);
    expect(circle.args[3]).toBeLessThan(word.args[2].duration); // it starts before the word has finished growing
  });

  it('brings the words in only after the film has taken over: question, then buttons and drifting words', () => {
    renderHero({ reduced: false });
    const at = (target) => setup.__calls.find((c) => c.method === 'fromTo' && c.args[0] === target);
    const circle = setup.__calls.find((c) => c.method === 'fromTo' && c.args[1]?.['--wc'] !== undefined);
    const circleEnds = circle.args[3] + circle.args[2].duration;

    expect(at('[data-veil]').args[3]).toBeGreaterThan(circle.args[3]); // the veil follows the circle
    expect(at('[data-q]').args[1].opacity).toBe(0);
    expect(at('[data-q]').args[2].opacity).toBe(1);
    expect(at('[data-q]').args[3]).toBeGreaterThan(circle.args[3] + circle.args[2].duration * 0.5);
    expect(at('[data-cta]').args[3]).toBeGreaterThan(at('[data-q]').args[3]);
    expect(at('[data-ticker]').args[3]).toBeGreaterThanOrEqual(at('[data-cta]').args[3]);
    expect(at('[data-cta]').args[3]).toBeGreaterThan(circleEnds - 0.2);
  });

  it('drops the word in from above, slowly and smoothly with no bounce, once the opening has finished', () => {
    const { container } = renderHero({ reduced: false, ready: true });
    const fall = setup.__drops.find(([, from]) => from['--dy'] !== undefined);
    const depth = setup.__drops.find(([, from]) => from['--wd'] !== undefined);

    expect(fall[0]).toBe(stage(container));
    expect(fall[1]['--dy']).toBe('-120vh');
    expect(fall[2]['--dy']).toBe('0vh');
    expect(fall[2].duration).toBeGreaterThanOrEqual(3);
    expect(fall[2].ease).not.toMatch(/bounce|elastic|back/);
    // It starts big and close and settles to its size as it lands: depth.
    expect(depth[1]['--wd']).toBeGreaterThan(1);
    expect(depth[2]['--wd']).toBe(1);
  });

  it('waits for the opening: nothing falls while the loader is still playing', () => {
    renderHero({ reduced: false, ready: false });
    expect(setup.__drops).toHaveLength(0);
  });

  it('pushes the camera in as the window opens, from a zoomed-out start', () => {
    renderHero({ reduced: false });
    const zoom = setup.__calls.find((c) => c.method === 'fromTo' && c.args[0] === '[data-scene]');

    expect(zoom.args[1].scale).toBe(HERO_START_SCALE);
    expect(HERO_START_SCALE).toBeLessThan(1);
    expect(zoom.args[2].scale).toBe(1);
  });

  it('lifts the question away before the answer rises in', () => {
    renderHero({ reduced: false });
    const question = setup.__calls.find((c) => c.method === 'to' && c.args[0] === '[data-q]');
    const answer = setup.__calls.find((c) => c.method === 'fromTo' && c.args[0] === '[data-aw]');

    expect(question.args[1].opacity).toBe(0);
    expect(answer.args[1].yPercent).toBeGreaterThan(100); // starts hidden below its mask
    expect(answer.args[2].yPercent).toBe(0);
    expect(question.args[2]).toBeLessThan(answer.args[3]);
  });

  it('holds the finished frame for a beat before the pin lets go', () => {
    renderHero({ reduced: false });
    const hold = setup.__calls.find((c) => c.method === 'to' && JSON.stringify(c.args[0]) === '{}');
    expect(hold).toBeTruthy();
    expect(hold.args[2]).toBeGreaterThanOrEqual(0.7);
  });

  it('keeps the whole exchange in the page for assistive technology', () => {
    renderHero({ reduced: false });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/where.s the shuttle\?\s*right\s*here\./i);
  });

  it('keeps the buttons in the page, faded up by the film (the nav keeps "Get the app" on the first screen)', () => {
    const { container } = renderHero({ reduced: false });

    expect(screen.getByRole('link', { name: /i'm a rider/i })).toHaveAttribute('href', '#join');
    expect(screen.getByRole('link', { name: /i'm a driver/i })).toHaveAttribute('href', '#join');
    expect(container.querySelector('[data-cta]')).toContainElement(screen.getByRole('link', { name: /i'm a rider/i }));
    const cta = setup.__calls.find((c) => c.method === 'fromTo' && c.args[0] === '[data-cta]');
    expect(cta.args[1].opacity).toBe(0);
    expect(cta.args[2].opacity).toBe(1);
  });

  it('speeds the road with scroll, via the GSAP ticker, and stops when it leaves', () => {
    const { unmount } = renderHero({ reduced: false });
    const tick = gsap.ticker.add.mock.calls[0][0];

    expect(typeof tick).toBe('function');
    unmount();
    expect(gsap.ticker.remove).toHaveBeenCalledWith(tick);
  });

  it('does not run the speed ticker for reduced motion', () => {
    renderHero({ reduced: true });
    expect(gsap.ticker.add).not.toHaveBeenCalled();
  });
});

describe('Hero (with the film clip)', () => {
  const sceneTween = () => setup.__calls.find((c) => c.method === 'fromTo' && c.args[0] === '[data-scene]');

  it('plays the clip in the window, and draws no coded road behind it', () => {
    const { container } = renderHero({ reduced: false, video: HERO_VIDEO });

    expect(container.querySelector('[data-scene] video')).not.toBeNull();
    expect(container.querySelector('[data-scene] canvas')).toBeNull();
  });

  it('draws the coded road instead when there is no clip', () => {
    const { container } = renderHero({ reduced: false, video: null });

    expect(container.querySelector('[data-scene] canvas')).not.toBeNull();
    expect(container.querySelector('[data-scene] video')).toBeNull();
  });

  it('shows a still, with no video, for reduced motion', () => {
    const { container } = renderHero({ reduced: true, video: HERO_VIDEO });

    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('[data-scene] img')).toHaveAttribute('src', HERO_VIDEO.wide.still);
  });

  it('plays the portrait cut on an upright phone, and the wide one on a wide screen', () => {
    const { innerWidth, innerHeight } = window;
    try {
      window.innerWidth = 390;
      window.innerHeight = 844;
      const phone = renderHero({ reduced: false, video: HERO_VIDEO }).container;
      expect(phone.querySelector('source')).toHaveAttribute('src', HERO_VIDEO.tall.src);
      expect(phone.querySelector('video')).toHaveAttribute('poster', HERO_VIDEO.tall.poster);

      window.innerWidth = 1440;
      window.innerHeight = 900;
      const desktop = renderHero({ reduced: false, video: HERO_VIDEO }).container;
      expect(desktop.querySelector('source')).toHaveAttribute('src', HERO_VIDEO.wide.src);
    } finally {
      window.innerWidth = innerWidth;
      window.innerHeight = innerHeight;
    }
  });

  it('pushes the camera in a little instead of zooming out, so the clip never shows its own edges', () => {
    renderHero({ reduced: false, video: HERO_VIDEO });
    const zoom = sceneTween();

    expect(zoom.args[1].scale).toBe(1);
    expect(zoom.args[2].scale).toBe(HERO_VIDEO_PUSH);
    expect(HERO_VIDEO_PUSH).toBeGreaterThan(1);
  });

  it('never slides the clip: the word spans the screen, so the clip\'s own edge would show through the letters', () => {
    renderHero({ reduced: false, video: HERO_VIDEO });
    const zoom = sceneTween();

    expect(zoom.args[1].x).toBe(0);
    expect(zoom.args[1].y).toBe(0);
    expect(zoom.args[2].x).toBe(0);
    expect(zoom.args[2].y).toBe(0);
    expect(zoom.args[3]).toBe(0); // together with the word
  });

  it('puts the colour tint over the window itself, not over the sliding scene', () => {
    const { container } = renderHero({ reduced: false, video: HERO_VIDEO });

    expect(container.querySelector('[data-window] > div.bg-l-ink\\/15')).not.toBeNull();
    expect(container.querySelector('[data-scene] .bg-l-ink\\/15')).toBeNull();
  });

  it('does not run the road-speed ticker: a clip plays at its own pace', () => {
    renderHero({ reduced: false, video: HERO_VIDEO });
    expect(gsap.ticker.add).not.toHaveBeenCalled();
  });

  it('keeps the same bold question and answer, and both buttons, over the clip', () => {
    renderHero({ reduced: false, video: HERO_VIDEO });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/where.s the shuttle\?\s*right\s*here\./i);
    expect(screen.getByRole('link', { name: /i'm a rider/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /i'm a driver/i })).toBeInTheDocument();
  });
});
