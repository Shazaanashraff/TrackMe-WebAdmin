import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import * as lenisModule from 'lenis';
import { gsap, ScrollTrigger } from '../motion/gsapSetup';
import { MotionProvider } from '../motion/MotionProvider';
import { useMotion } from '../motion/context';

vi.mock('lenis', () => {
  const instances = [];
  class FakeLenis {
    constructor(options) {
      this.options = options;
      this.on = vi.fn();
      this.raf = vi.fn();
      this.destroy = vi.fn();
      this.scrollTo = vi.fn();
      instances.push(this);
    }
  }
  return { default: FakeLenis, __instances: instances };
});

vi.mock('../motion/gsapSetup', () => ({
  gsap: { ticker: { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() } },
  ScrollTrigger: { update: vi.fn() },
  setupGsap: vi.fn(),
  EASE: {},
}));

const stubMotion = ({ reduce = false } = {}) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const instances = () => lenisModule.__instances;

function Probe() {
  const { reduced, lenis, scrollTo } = useMotion();
  return (
    <div>
      <p data-testid="state">{`${reduced ? 'reduced' : 'full'}|${lenis ? 'lenis' : 'native'}`}</p>
      <button type="button" onClick={() => scrollTo(120)}>go</button>
    </div>
  );
}

beforeEach(() => {
  instances().length = 0;
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  delete window.matchMedia;
});

describe('MotionProvider', () => {
  it('starts one smooth-scroll instance and drives it from the GSAP ticker', () => {
    stubMotion();
    render(<MotionProvider><Probe /></MotionProvider>);

    expect(instances()).toHaveLength(1);
    const lenis = instances()[0];
    expect(lenis.on).toHaveBeenCalledWith('scroll', ScrollTrigger.update);
    expect(gsap.ticker.lagSmoothing).toHaveBeenCalledWith(0);

    // The ticker hands Lenis the time in seconds; Lenis wants milliseconds.
    const tick = gsap.ticker.add.mock.calls[0][0];
    tick(2.5);
    expect(lenis.raf).toHaveBeenCalledWith(2500);
    expect(screen.getByTestId('state')).toHaveTextContent('full|lenis');
  });

  it('gives visitors who prefer reduced motion the browser\'s own scrolling', () => {
    stubMotion({ reduce: true });
    render(<MotionProvider><Probe /></MotionProvider>);

    expect(instances()).toHaveLength(0);
    expect(gsap.ticker.add).not.toHaveBeenCalled();
    expect(screen.getByTestId('state')).toHaveTextContent('reduced|native');
  });

  it('does nothing where animation is unavailable (no matchMedia)', () => {
    render(<MotionProvider><Probe /></MotionProvider>);

    expect(instances()).toHaveLength(0);
    expect(screen.getByTestId('state')).toHaveTextContent('reduced|native');
  });

  it('shuts the smooth scroll down cleanly when the page unmounts', () => {
    stubMotion();
    const { unmount } = render(<MotionProvider><Probe /></MotionProvider>);
    const tick = gsap.ticker.add.mock.calls[0][0];

    unmount();

    expect(instances()[0].destroy).toHaveBeenCalledTimes(1);
    expect(gsap.ticker.remove).toHaveBeenCalledWith(tick);
  });

  it('does not create a second instance when it re-renders', () => {
    stubMotion();
    const { rerender } = render(<MotionProvider><Probe /></MotionProvider>);
    rerender(<MotionProvider><Probe /></MotionProvider>);

    expect(instances()).toHaveLength(1);
  });
});

describe('MotionProvider anchor links', () => {
  const page = () => render(
    <MotionProvider>
      <a href="#join">to join</a>
      <a href="#missing">to nowhere</a>
      <a href="/login">sign in</a>
      <section id="join">join</section>
    </MotionProvider>,
  );

  it('glides to an in-page anchor instead of jumping, and updates the URL', () => {
    stubMotion();
    page();

    const notPrevented = fireEvent.click(screen.getByText('to join'));

    expect(notPrevented).toBe(false); // default navigation was cancelled
    expect(instances()[0].scrollTo).toHaveBeenCalledWith(document.getElementById('join'), expect.objectContaining({ duration: 1.6 }));
    expect(window.location.hash).toBe('#join');
  });

  it('leaves a link to a section that does not exist alone', () => {
    stubMotion();
    page();

    expect(fireEvent.click(screen.getByText('to nowhere'))).toBe(true);
    expect(instances()[0].scrollTo).not.toHaveBeenCalled();
  });

  it('leaves ordinary links and modified clicks alone', () => {
    stubMotion();
    page();
    // jsdom cannot navigate and says so on the console; that is not what is under test.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(fireEvent.click(screen.getByText('sign in'))).toBe(true);
    expect(fireEvent.click(screen.getByText('to join'), { ctrlKey: true })).toBe(true);
    expect(instances()[0].scrollTo).not.toHaveBeenCalled();
    quiet.mockRestore();
  });

  it('does not touch anchors at all when smooth scrolling is off', () => {
    stubMotion({ reduce: true });
    page();

    expect(fireEvent.click(screen.getByText('to join'))).toBe(true);
  });
});

describe('MotionProvider scrollTo', () => {
  it('uses Lenis when it is running', () => {
    stubMotion();
    render(<MotionProvider><Probe /></MotionProvider>);

    fireEvent.click(screen.getByText('go'));

    expect(instances()[0].scrollTo).toHaveBeenCalledWith(120, expect.any(Object));
  });

  it('falls back to the browser when it is not', () => {
    stubMotion({ reduce: true });
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(<MotionProvider><Probe /></MotionProvider>);

    fireEvent.click(screen.getByText('go'));

    expect(scrollTo).toHaveBeenCalledWith({ top: 120 });
  });
});
