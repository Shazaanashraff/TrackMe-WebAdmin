import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WhatSection } from '../WhatSection';
import { MotionContext } from '../motion/context';
import { POINTS, STATEMENT } from '../config';

const media = vi.hoisted(() => ({ phone: false }));
vi.mock('@/hooks/use-media-query', () => ({ useMediaQuery: () => media.phone }));

// GSAP stand-in: runs the setup and records what it was asked to animate.
vi.mock('../motion/gsapSetup', () => {
  const revert = vi.fn();
  const calls = [];
  const timeline = new Proxy({}, { get: (_, method) => (...args) => { calls.push({ method, args }); return timeline; } });
  return {
    EASE: { linear: 'none' },
    ScrollTrigger: {},
    gsap: {
      context: vi.fn((fn) => { fn(); return { revert }; }),
      fromTo: vi.fn(),
      timeline: vi.fn(() => timeline),
      utils: { toArray: (selector, scope) => Array.from(scope.querySelectorAll(selector)) },
    },
    __revert: revert,
    __calls: calls,
  };
});

import { gsap } from '../motion/gsapSetup';
import * as setup from '../motion/gsapSetup';

const renderSection = ({ reduced = false } = {}) => render(
  <MotionContext.Provider value={{ lenis: null, reduced, canAnimate: !reduced, scrollTo: () => {} }}>
    <WhatSection />
  </MotionContext.Provider>,
);

beforeEach(() => {
  vi.clearAllMocks();
  setup.__calls.length = 0;
  media.phone = false;
});

describe('WhatSection (the statement and the three points)', () => {
  it('says one sentence, then three points by their title alone: no descriptions', () => {
    const { container } = renderSection();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(STATEMENT.replace(/\s+/g, ' '));
    const titles = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent);
    expect(titles).toEqual(POINTS.map((point) => point.title));
    POINTS.forEach((point) => expect(point).not.toHaveProperty('body'));
    expect(container.querySelectorAll('li p')).toHaveLength(0);
  });

  it('numbers the points 01 to 03 and draws a picture in each', () => {
    const { container } = renderSection();
    const cells = Array.from(container.querySelectorAll('[data-point]'));

    expect(cells).toHaveLength(3);
    expect(cells.map((cell) => cell.textContent.slice(0, 2))).toEqual(['01', '02', '03']);
    cells.forEach((cell) => expect(cell.querySelector('svg')).not.toBeNull());
  });

  it('has no hover colour change and no arrow that appears on hover', () => {
    const { container } = renderSection();

    expect(container.innerHTML).not.toMatch(/hover:bg-|group-hover/);
    expect(container.querySelectorAll('[data-point] svg.lucide')).toHaveLength(0);
  });

  it('tags the parts of each drawing that play on a phone: the road, its stops, the key, the bars', () => {
    const { container } = renderSection();

    expect(container.querySelectorAll('[data-draw]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-stop]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-key]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-approved]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-bar]')).toHaveLength(3);
    // The bars are the filled part, not the empty track behind them.
    container.querySelectorAll('[data-bar]').forEach((bar) => expect(bar.getAttribute('fill')).toBe('currentColor'));
  });

  it('plays nothing off a phone', () => {
    renderSection();
    expect(gsap.timeline).not.toHaveBeenCalled();
  });

  it('plays nothing on a phone for visitors who prefer reduced motion', () => {
    media.phone = true;
    renderSection({ reduced: true });
    expect(gsap.timeline).not.toHaveBeenCalled();
  });

  it('on a phone, plays each cell as it scrolls through: its own scrubbed timeline', () => {
    media.phone = true;
    const { container } = renderSection();
    const cells = Array.from(container.querySelectorAll('[data-point]'));

    expect(gsap.timeline).toHaveBeenCalledTimes(3);
    gsap.timeline.mock.calls.forEach(([vars], i) => {
      expect(vars.scrollTrigger.trigger).toBe(cells[i]);
      expect(vars.scrollTrigger.scrub).toBeTruthy();
      expect(vars.scrollTrigger.pin).toBeUndefined(); // nothing is held still
    });
  });

  it('on a phone, draws the road in, lights the key letter by letter, fills the bars, and slides each title in', () => {
    media.phone = true;
    renderSection();
    const fromTo = setup.__calls.filter((c) => c.method === 'fromTo').map((c) => c.args);
    const on = (selector) => fromTo.filter(([target]) => (target instanceof Element ? target.matches(selector) : Array.from(target).some((el) => el.matches(selector))));

    const [draw] = on('[data-draw]');
    expect(draw[1].attr['stroke-dashoffset']).toBe(1); // not drawn yet
    expect(draw[2].attr['stroke-dashoffset']).toBe(0); // drawn
    expect(on('[data-stop]')).toHaveLength(1);

    const [keys] = on('[data-key]');
    expect(keys[1].opacity).toBeLessThan(0.2);
    expect(keys[2].opacity).toBe(1);
    expect(keys[2].stagger).toBeGreaterThan(0); // letter by letter
    expect(on('[data-approved]')).toHaveLength(1);

    const [bars] = on('[data-bar]');
    expect(bars[1].scaleX).toBe(0);
    expect(bars[2].scaleX).toBe(1);

    expect(on('h3')).toHaveLength(3); // every title slides in
    on('h3').forEach(([, from, to]) => {
      expect(from.x).toBeLessThan(0);
      expect(to.x).toBe(0);
    });
  });

  it('tears the animation down when it leaves', () => {
    media.phone = true;
    const { unmount } = renderSection();
    unmount();
    expect(setup.__revert).toHaveBeenCalled();
  });
});
