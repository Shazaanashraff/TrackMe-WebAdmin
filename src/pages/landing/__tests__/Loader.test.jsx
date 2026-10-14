import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Loader } from '../motion/Loader';
import { MotionContext } from '../motion/context';
import { INTRO_MAX_MS } from '../motion/intro';
import { gsap } from '../motion/gsapSetup';

// A GSAP stand-in that records the timeline instead of animating it.
vi.mock('../motion/gsapSetup', () => {
  const timeline = {
    from: vi.fn(() => timeline),
    to: vi.fn(() => timeline),
    kill: vi.fn(),
  };
  return {
    EASE: { out: 'o', inOut: 'io', soft: 's', linear: 'l' },
    gsap: {
      context: vi.fn((fn) => { fn(); return { revert: vi.fn() }; }),
      timeline: vi.fn((vars) => { timeline.vars = vars; return timeline; }),
    },
    __timeline: timeline,
  };
});

const withLenis = (ui, lenis) => (
  <MotionContext.Provider value={{ lenis, reduced: false, canAnimate: true, scrollTo: () => {} }}>{ui}</MotionContext.Provider>
);

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  document.documentElement.style.overflow = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Loader', () => {
  it('announces itself as a status, with the counter at zero', () => {
    render(<Loader onDone={vi.fn()} />);

    expect(screen.getByRole('status', { name: /loading pingo/i })).toBeInTheDocument();
    expect(screen.getByText('000')).toBeInTheDocument();
  });

  it('builds one timeline and finishes the opening when it completes', () => {
    const onDone = vi.fn();
    render(<Loader onDone={onDone} />);

    expect(gsap.timeline).toHaveBeenCalledTimes(1);
    act(() => { gsap.timeline.mock.calls[0][0].onComplete(); });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('is never allowed to outstay its welcome, even if the animation stalls', () => {
    const onDone = vi.fn();
    render(<Loader onDone={onDone} />);

    act(() => { vi.advanceTimersByTime(INTRO_MAX_MS - 1); });
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2); });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('only ever reports done once, however it finishes', () => {
    const onDone = vi.fn();
    render(<Loader onDone={onDone} />);

    act(() => { gsap.timeline.mock.calls[0][0].onComplete(); });
    act(() => { vi.advanceTimersByTime(INTRO_MAX_MS + 100); });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('stops its safety timer when it leaves early', () => {
    const onDone = vi.fn();
    const { unmount } = render(<Loader onDone={onDone} />);

    unmount();
    act(() => { vi.advanceTimersByTime(INTRO_MAX_MS + 100); });

    expect(onDone).not.toHaveBeenCalled();
  });

  it('locks scrolling while it plays and restores it afterwards', () => {
    document.documentElement.style.overflow = 'auto';
    const { unmount } = render(<Loader onDone={vi.fn()} />);
    expect(document.documentElement.style.overflow).toBe('hidden');

    unmount();
    expect(document.documentElement.style.overflow).toBe('auto');
  });

  it('pauses and then resumes smooth scrolling', () => {
    const lenis = { stop: vi.fn(), start: vi.fn() };
    const { unmount } = render(withLenis(<Loader onDone={vi.fn()} />, lenis));

    expect(lenis.stop).toHaveBeenCalledTimes(1);
    expect(lenis.start).not.toHaveBeenCalled();

    unmount();
    expect(lenis.start).toHaveBeenCalledTimes(1);
  });

  it('works without smooth scrolling at all', () => {
    expect(() => render(<Loader onDone={vi.fn()} />)).not.toThrow();
  });

  it('opens from the shuttle: the reveal circle is centred on the hero\'s shuttle position', () => {
    const { container } = render(<Loader onDone={vi.fn()} />);
    const root = container.firstChild;

    expect(root.style.getPropertyValue('--x')).toMatch(/%$/);
    expect(root.style.getPropertyValue('--y')).toMatch(/%$/);
    expect(root.style.getPropertyValue('--r')).toBe('0%');
  });
});
