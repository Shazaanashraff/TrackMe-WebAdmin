import { describe, it, expect, vi, afterEach } from 'vitest';

// A parent's effect runs after its children's, so registering ScrollTrigger from a provider's effect
// left the hero and the story building triggers with no plugin: every pinned scroll animation did
// nothing in a production build (React's dev-only double effect hid it). It must register at import.

const realMatchMedia = window.matchMedia;
afterEach(() => {
  window.matchMedia = realMatchMedia;
  vi.resetModules();
});

const stubMatchMedia = () => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
};

describe('gsapSetup', () => {
  it('has ScrollTrigger registered the moment it is imported, before any component effect runs', async () => {
    stubMatchMedia();
    vi.resetModules();
    const { gsap, ScrollTrigger } = await import('../motion/gsapSetup');

    expect(gsap.core.globals().ScrollTrigger).toBe(ScrollTrigger);
  });

  it('imports quietly where there is no matchMedia (jsdom): nothing can scroll there', async () => {
    delete window.matchMedia;
    vi.resetModules();

    await expect(import('../motion/gsapSetup')).resolves.toBeDefined();
  });
});
