import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JoinSection } from '../JoinSection';

vi.mock('../useAppDownloadLinks', () => ({
  useAppDownloadLinks: vi.fn(),
}));

import { useAppDownloadLinks } from '../useAppDownloadLinks';

// GSAP stand-in: runs the setup and records what it was asked to animate.
vi.mock('../motion/gsapSetup', () => {
  const revert = vi.fn();
  return {
    EASE: { linear: 'none', out: 'power4.out' },
    ScrollTrigger: {},
    gsap: {
      context: vi.fn((fn) => { fn(); return { revert }; }),
      from: vi.fn(),
      fromTo: vi.fn(),
    },
    __revert: revert,
  };
});

import { gsap } from '../motion/gsapSetup';
import * as setup from '../motion/gsapSetup';
import { MotionContext } from '../motion/context';

const media = vi.hoisted(() => ({ phone: false }));
vi.mock('@/hooks/use-media-query', () => ({ useMediaQuery: () => media.phone }));

const animated = (ui) => (
  <MotionContext.Provider value={{ lenis: null, reduced: false, canAnimate: true, scrollTo: () => {} }}>
    {ui}
  </MotionContext.Provider>
);

describe('JoinSection — the question and the two numbered halves', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    media.phone = false;
    useAppDownloadLinks.mockReturnValue({ riderAndroid: null, riderIos: null, driverAndroid: null });
  });

  it('asks the question on a paper-coloured band, with the section above hanging a tab over it', () => {
    const { container } = render(<JoinSection />);

    expect(screen.getByRole('heading', { level: 2, name: /rider or driver\?/i }).closest('.bg-l-bone')).not.toBeNull();
    expect(container.querySelector('[data-tab="ink"]')).not.toBeNull();
  });

  it('says nothing but the question and the two answers: no eyebrow, no strapline, no descriptions', () => {
    const { container } = render(<JoinSection />);

    expect(screen.queryByText(/get started/i)).toBeNull();
    expect(screen.queryByText(/pick the one that is you/i)).toBeNull();
    expect(screen.queryByText(/enter your driver/i)).toBeNull();
    expect(screen.queryByText(/we.ll send the app/i)).toBeNull();
    expect(container.querySelectorAll('h3')).toHaveLength(2);
  });

  it('leads each half with a big solid numeral, 01 for riders and 02 for drivers', () => {
    const { container } = render(<JoinSection />);
    const halves = container.querySelectorAll('[data-panel]');

    expect(halves).toHaveLength(2);
    expect(halves[0].textContent).toMatch(/^01/);
    expect(halves[1].textContent).toMatch(/^02/);
    halves.forEach((half) => {
      const numeral = half.querySelector('span[aria-hidden="true"] ~ *, span[aria-hidden="true"]');
      expect(numeral.className).toMatch(/text-l-sky/);
      expect(numeral.className).not.toMatch(/l-outline/); // solid, not a faint outline
    });
    expect(container.querySelector('.l-outline-ink')).toBeNull();
  });

  it('puts the rider in the first half and the driver in the second, side by side as one spread', () => {
    const { container } = render(<JoinSection />);
    const [rider, driver] = container.querySelectorAll('[data-panel]');

    expect(container.querySelector('.l-split')).toContainElement(rider);
    expect(container.querySelector('.l-split')).toContainElement(driver);
    expect(rider).toHaveTextContent(/i.m a rider/i);
    expect(driver).toHaveTextContent(/i.m a driver/i);
    expect(driver.querySelector('form')).not.toBeNull();
  });

  it('has no hover colour changes or pointer glow, and no circle wipe', () => {
    const { container } = render(<JoinSection />);
    const html = container.innerHTML;

    expect(html).not.toMatch(/hover:bg-/);
    expect(html).not.toMatch(/l-spot|l-panel-/);
    expect(container.querySelector('[data-wipe]')).toBeNull();
  });

  it('draws the rider half as the download area: the rider app badge and a phone showing the live map', () => {
    const { container } = render(<JoinSection />);
    const [rider] = container.querySelectorAll('[data-panel]');

    expect(rider.querySelectorAll('button, a[href]')).toHaveLength(1);
    // Decorative: a phone rising from the bottom edge (wide) and under the badges inside an arch (phone).
    expect(rider.querySelectorAll('[aria-hidden="true"] [data-map-screen], [aria-hidden="true"] [data-route]').length).toBeGreaterThan(0);
    expect(rider.querySelector('[data-arch]')).not.toBeNull();
  });

  it('plays nothing off a phone, even when motion is welcome', () => {
    render(animated(<JoinSection />));

    expect(gsap.from).not.toHaveBeenCalled();
    expect(gsap.fromTo.mock.calls.some(([target]) => target === '[data-arch]' || target === '[data-phone-rise]')).toBe(false);
  });

  it('on a phone: lifts the question word by word, brings each half up, and grows the arch as the phone climbs', () => {
    media.phone = true;
    const { container } = render(animated(<JoinSection />));

    const words = gsap.from.mock.calls.find(([targets]) => targets.length && targets[0].hasAttribute('data-hw'));
    expect(words[0]).toHaveLength(3);
    expect(words[1].yPercent).toBeGreaterThan(100); // starts behind its mask
    expect(words[1].stagger).toBeGreaterThan(0);
    expect(words[1].scrollTrigger.toggleActions).toBe('play none none reverse');

    const panels = gsap.from.mock.calls.filter(([target]) => target instanceof Element && target.hasAttribute('data-panel'));
    expect(panels).toHaveLength(2);
    panels.forEach(([, vars]) => expect(vars.opacity).toBe(0));

    const arch = gsap.fromTo.mock.calls.find(([target]) => target === '[data-arch]');
    const rise = gsap.fromTo.mock.calls.find(([target]) => target === '[data-phone-rise]');
    expect(arch[1].scaleY).toBeLessThan(1);
    expect(arch[2].scaleY).toBe(1);
    expect(arch[2].scrollTrigger.scrub).toBeTruthy();
    expect(rise[1].y).toBeGreaterThan(rise[2].y); // the phone climbs
    expect(container.querySelector('[data-arch]')).not.toBeNull();
  });

  it('tears the animation down when it leaves', () => {
    media.phone = true;
    const { unmount } = render(animated(<JoinSection />));
    unmount();
    expect(setup.__revert).toHaveBeenCalled();
  });
});

describe('JoinSection — app download links', () => {
  it('shows a direct download for both the rider app and the driver app, with no "Coming soon" and no iPhone badge', () => {
    useAppDownloadLinks.mockReturnValue({
      riderAndroid: '/downloads/rider-app-1.0.0.apk',
      riderIos: null,
      driverAndroid: '/downloads/driver-app-1.0.0.apk',
    });
    render(<JoinSection />);

    expect(screen.getByRole('link', { name: /rider app/i })).toHaveAttribute('href', '/downloads/rider-app-1.0.0.apk');
    expect(screen.getByRole('link', { name: /driver app/i })).toHaveAttribute('href', '/downloads/driver-app-1.0.0.apk');
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    expect(screen.queryByText(/iphone/i)).toBeNull();
  });

  it('keeps the driver email form alongside the driver download', () => {
    useAppDownloadLinks.mockReturnValue({
      riderAndroid: '/downloads/rider-app-1.0.0.apk',
      riderIos: null,
      driverAndroid: '/downloads/driver-app-1.0.0.apk',
    });
    render(<JoinSection />);

    expect(screen.getByLabelText('Your email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get driver access/i })).toBeInTheDocument();
  });

  it('falls back to a disabled badge only if a link is genuinely missing', () => {
    useAppDownloadLinks.mockReturnValue({ riderAndroid: null, riderIos: null, driverAndroid: null });
    render(<JoinSection />);

    expect(screen.getAllByText(/coming soon/i)).toHaveLength(2);
  });
});
