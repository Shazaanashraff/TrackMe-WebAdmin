import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from '../Footer';
import { MotionContext } from '../motion/context';
import { PRIVACY_URL } from '../config';
import { gsap } from '../motion/gsapSetup';

// GSAP stand-in: runs the setup and records what it was asked to animate.
vi.mock('../motion/gsapSetup', () => {
  const revert = vi.fn();
  return {
    EASE: { linear: 'none' },
    ScrollTrigger: {},
    gsap: {
      context: vi.fn((fn) => { fn(); return { revert }; }),
      fromTo: vi.fn(),
    },
    __revert: revert,
  };
});
import * as setup from '../motion/gsapSetup';

const renderFooter = ({ reduced }) => render(
  <MemoryRouter>
    <MotionContext.Provider value={{ lenis: null, reduced, canAnimate: !reduced, scrollTo: () => {} }}>
      <Footer />
    </MotionContext.Provider>
  </MemoryRouter>,
);

beforeEach(() => { vi.clearAllMocks(); });

describe('Footer (the finale)', () => {
  it('keeps the footer links: privacy policy (the published site) and manager sign in', () => {
    renderFooter({ reduced: true });

    const privacy = screen.getByRole('link', { name: /privacy policy/i });
    expect(privacy).toHaveAttribute('href', PRIVACY_URL);
    expect(privacy).toHaveAttribute('target', '_blank');
    expect(privacy).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    expect(screen.getByRole('link', { name: /manager sign in/i })).toHaveAttribute('href', '/login');
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Pingo`))).toBeInTheDocument();
  });

  it('draws the giant wordmark twice (outlined, and the filled copy that is revealed), both decoration', () => {
    const { container } = renderFooter({ reduced: true });
    const marks = Array.from(container.querySelectorAll('p')).filter((p) => p.textContent === 'Pingo');

    expect(marks).toHaveLength(2);
    expect(marks[0].parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('[data-fill]')).not.toBeNull();
  });

  it('gives the wordmark a tall enough line that the tail of the "g" is not cut off', () => {
    const { container } = renderFooter({ reduced: true });
    const [outline] = Array.from(container.querySelectorAll('p')).filter((p) => p.textContent === 'Pingo');

    expect(outline.className).toMatch(/leading-\[1\.1\d?\]/);
    expect(outline.parentElement.className).toMatch(/pb-6/); // room under it before the page ends
  });

  it('has a layer of sky that opens from the bottom edge, and is simply open when nothing animates', () => {
    const { container } = renderFooter({ reduced: true });
    const wipe = container.querySelector('[data-wipe]');

    expect(wipe).toHaveAttribute('aria-hidden', 'true');
    expect(wipe).toHaveClass('l-wipe', 'bg-l-sky');
    expect(wipe.style.getPropertyValue('--y')).toBe('100%');
    expect(wipe.style.getPropertyValue('--r')).toBe(''); // the stylesheet's default is "fully open"
  });

  it('plays nothing for reduced motion', () => {
    renderFooter({ reduced: true });
    expect(gsap.fromTo).not.toHaveBeenCalled();
  });

  it('opens the sky circle from nothing to more than the whole footer as the page ends', () => {
    renderFooter({ reduced: false });
    const [target, from, to] = gsap.fromTo.mock.calls.find(([t]) => t === '[data-wipe]');

    expect(target).toBe('[data-wipe]');
    expect(from['--r']).toBe('0%');
    expect(parseFloat(to['--r'])).toBeGreaterThanOrEqual(150); // reaches every corner on any screen
    expect(to.scrollTrigger.scrub).toBeTruthy();
    // Finished exactly when the very bottom of the page arrives, at any screen size.
    expect(to.scrollTrigger.end).toBe('bottom bottom');
  });

  it('fills the wordmark in from left to right, done as the page ends', () => {
    renderFooter({ reduced: false });
    const [, from, to] = gsap.fromTo.mock.calls.find(([t]) => t === '[data-fill]');

    expect(from.clipPath).toBe('inset(-20% 100% -30% 0%)'); // nothing shown (room above and below for the "g" tail)
    expect(to.clipPath).toBe('inset(-20% 0% -30% 0%)'); // all of it
    expect(to.scrollTrigger.end).toBe('bottom bottom');
  });

  it('tears the animation down when it leaves', () => {
    const { unmount } = renderFooter({ reduced: false });
    unmount();
    expect(setup.__revert).toHaveBeenCalled();
  });
});
