import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { NightRoad } from '../NightRoad';

// A drawing context that accepts everything and records the calls we care about.
function fakeContext(log) {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return () => {
        log[prop] = (log[prop] || 0) + 1;
        if (prop.startsWith('create')) return gradient;
        return undefined;
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

const stubReducedMotion = (reduce) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

let log;
let getContext;

beforeEach(() => {
  log = {};
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
  getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => fakeContext(log));
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.matchMedia;
  delete HTMLCanvasElement.prototype.clientWidth;
  delete HTMLCanvasElement.prototype.clientHeight;
});

describe('NightRoad', () => {
  it('is decorative: a canvas hidden from assistive technology', () => {
    const { container } = render(<NightRoad className="x" />);
    const canvas = container.querySelector('canvas');

    expect(canvas).toHaveAttribute('aria-hidden', 'true');
    expect(canvas).toHaveClass('x');
  });

  it('copes with a browser that has no 2D drawing at all', () => {
    getContext.mockImplementation(() => null);
    const raf = vi.spyOn(window, 'requestAnimationFrame');

    expect(() => render(<NightRoad />)).not.toThrow();
    expect(raf).not.toHaveBeenCalled();
  });

  it('paints one still frame and never animates when the visitor prefers reduced motion', () => {
    stubReducedMotion(true);
    const raf = vi.spyOn(window, 'requestAnimationFrame');

    render(<NightRoad />);

    expect(raf).not.toHaveBeenCalled();
    expect(log.drawImage).toBe(1); // the backdrop, composed once
    expect(log.fillText).toBeGreaterThan(0); // the reticle's tag made it into the frame
  });

  it('animates by default, and cleans up its frame and listeners when it leaves', () => {
    stubReducedMotion(false);
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 42);
    const caf = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(<NightRoad />);
    expect(raf).toHaveBeenCalled();

    unmount();
    expect(caf).toHaveBeenCalledWith(42);
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('sizes its backing store for sharp pixels but caps the cost', () => {
    stubReducedMotion(true);
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 });
    const { container } = render(<NightRoad />);
    const canvas = container.querySelector('canvas');

    // 800px wide at a capped 1.5x, not 3x.
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(900);
    delete window.devicePixelRatio;
  });
});
