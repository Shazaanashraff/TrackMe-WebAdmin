import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { Cursor } from '../Cursor';
import { MotionContext } from '../motion/context';
import { gsap } from '../motion/gsapSetup';

// GSAP stand-in: quickTo hands back plain functions we can inspect.
vi.mock('../motion/gsapSetup', () => {
  const setters = [];
  return {
    EASE: {},
    ScrollTrigger: {},
    gsap: {
      set: vi.fn(),
      quickTo: vi.fn((target, prop) => {
        const fn = vi.fn();
        fn.target = target;
        fn.prop = prop;
        setters.push(fn);
        return fn;
      }),
      killTweensOf: vi.fn(),
    },
    __setters: setters,
  };
});
import * as setup from '../motion/gsapSetup';

const stubPointer = (fine) => {
  vi.stubGlobal('matchMedia', vi.fn((query) => ({
    matches: fine && query === '(pointer: fine)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })));
  window.matchMedia = globalThis.matchMedia;
};

const renderCursor = ({ reduced = false, canAnimate = true } = {}) => render(
  <MotionContext.Provider value={{ lenis: null, reduced, canAnimate, scrollTo: () => {} }}>
    <div>
      <a href="#x">a link</a>
      <p>some words</p>
      <Cursor />
    </div>
  </MotionContext.Provider>,
);

const move = (target, x, y) => act(() => {
  const event = new MouseEvent('pointermove', { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(event, 'target', { value: target });
  window.dispatchEvent(event);
});

const ring = (c) => c.querySelector('[data-cursor-ring]');
const dot = (c) => c.querySelector('[data-cursor-dot]');

beforeEach(() => {
  vi.clearAllMocks();
  setup.__setters.length = 0;
  stubPointer(true);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('Cursor (rendering)', () => {
  it('draws a ring and a dot for a mouse, hidden from assistive tech and never taking a click', () => {
    const { container } = renderCursor();

    expect(ring(container)).not.toBeNull();
    expect(dot(container)).not.toBeNull();
    const layer = ring(container).parentElement;
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer.className).toMatch(/pointer-events-none/);
  });

  it('draws nothing for a finger (touch screens have no cursor to follow)', () => {
    stubPointer(false);
    const { container } = renderCursor();

    expect(ring(container)).toBeNull();
    expect(gsap.quickTo).not.toHaveBeenCalled();
  });

  it('draws nothing for reduced motion, or where animation cannot run', () => {
    expect(ring(renderCursor({ reduced: true }).container)).toBeNull();
    expect(ring(renderCursor({ canAnimate: false }).container)).toBeNull();
  });

  it('starts out of sight, so it never flashes in a corner before the pointer has moved', () => {
    const { container } = renderCursor();
    expect(ring(container)).toHaveAttribute('data-visible', 'false');
    expect(dot(container)).toHaveAttribute('data-visible', 'false');
  });
});

describe('Cursor (following the pointer)', () => {
  it('moves the ring (with a lag) and the dot (almost instantly) to the pointer, and shows them', () => {
    const { container } = renderCursor();
    const text = container.querySelector('p');

    move(text, 320, 180);

    const byTarget = (el, prop) => setup.__setters.find((s) => s.target === el && s.prop === prop);
    expect(byTarget(ring(container), 'x')).toHaveBeenCalledWith(320);
    expect(byTarget(ring(container), 'y')).toHaveBeenCalledWith(180);
    expect(byTarget(dot(container), 'x')).toHaveBeenCalledWith(320);
    expect(byTarget(dot(container), 'y')).toHaveBeenCalledWith(180);
    expect(ring(container)).toHaveAttribute('data-visible', 'true');
    expect(dot(container)).toHaveAttribute('data-visible', 'true');

    const durations = gsap.quickTo.mock.calls.map(([target, , vars]) => [target, vars.duration]);
    const ringLag = durations.find(([t]) => t === ring(container))[1];
    const dotLag = durations.find(([t]) => t === dot(container))[1];
    expect(ringLag).toBeGreaterThan(dotLag);
  });

  it('swells the ring over anything you can press, and goes back over plain text', () => {
    const { container } = renderCursor();
    const link = container.querySelector('a');
    const text = container.querySelector('p');

    move(link, 10, 10);
    expect(ring(container)).toHaveAttribute('data-active', 'true');
    expect(dot(container)).toHaveAttribute('data-active', 'true');

    move(text, 20, 20);
    expect(ring(container)).toHaveAttribute('data-active', 'false');
    expect(dot(container)).toHaveAttribute('data-active', 'false');
  });

  it('hides when the pointer leaves the window', () => {
    const { container } = renderCursor();
    move(container.querySelector('p'), 5, 5);

    act(() => { document.dispatchEvent(new Event('pointerleave')); });

    expect(ring(container)).toHaveAttribute('data-visible', 'false');
  });

  it('stops listening and kills its tweens when it leaves the page', () => {
    const { container, unmount } = renderCursor();
    const el = ring(container);
    move(container.querySelector('p'), 5, 5);
    const calls = setup.__setters.reduce((sum, s) => sum + s.mock.calls.length, 0);

    unmount();
    act(() => { window.dispatchEvent(new MouseEvent('pointermove', { clientX: 1, clientY: 1 })); });

    expect(setup.__setters.reduce((sum, s) => sum + s.mock.calls.length, 0)).toBe(calls);
    expect(gsap.killTweensOf).toHaveBeenCalled();
    expect(el.isConnected).toBe(false);
  });
});
