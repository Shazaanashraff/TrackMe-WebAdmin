import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { LiveEta } from '../LiveEta';

const stubReducedMotion = (reduce) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

afterEach(() => {
  vi.useRealTimers();
  delete window.matchMedia;
});

describe('LiveEta', () => {
  it('starts at 4:00 and answers the headline: right here', () => {
    render(<LiveEta />);
    expect(screen.getByText('Right here.')).toBeInTheDocument();
    expect(screen.getByText('4:00')).toBeInTheDocument();
  });

  it('counts down every second', () => {
    vi.useFakeTimers();
    render(<LiveEta />);

    act(() => { vi.advanceTimersByTime(3000); });

    expect(screen.getByText('3:57')).toBeInTheDocument();
  });

  it('says the shuttle is at the stop when it arrives, then starts over', () => {
    vi.useFakeTimers();
    render(<LiveEta />);

    act(() => { vi.advanceTimersByTime(240 * 1000); });
    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getByText(/shuttle at your stop/i)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(4 * 1000); });
    expect(screen.getByText('4:00')).toBeInTheDocument();
  });

  it('holds still on a calm "4 min" when the visitor prefers reduced motion', () => {
    vi.useFakeTimers();
    stubReducedMotion(true);
    render(<LiveEta />);

    act(() => { vi.advanceTimersByTime(10000); });

    expect(screen.getByText('4 min')).toBeInTheDocument();
    expect(screen.queryByText(/^\d:\d\d$/)).not.toBeInTheDocument();
  });

  it('stops its timer when it leaves the page', () => {
    vi.useFakeTimers();
    const { unmount } = render(<LiveEta />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
