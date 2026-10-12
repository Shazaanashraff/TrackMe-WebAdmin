import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../LandingPage';
import { INTRO_KEY } from '../motion/intro';

// The page wiring is what is under test, not the animation itself.
vi.mock('../motion/MotionProvider', () => ({ MotionProvider: ({ children }) => children }));
vi.mock('../motion/Loader', () => ({
  Loader: ({ onDone }) => (
    <div role="status" aria-label="Loading TrackMe">
      <button type="button" onClick={onDone}>finish opening</button>
    </div>
  ),
}));

const stubMotion = ({ reduce = false } = {}) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const renderPage = () => render(<MemoryRouter><LandingPage /></MemoryRouter>);
const root = (container) => container.querySelector('.landing');

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  delete window.matchMedia;
});

describe('LandingPage opening', () => {
  it('plays the opening for a first visit and holds the page behind it', () => {
    stubMotion();
    const { container } = renderPage();

    expect(screen.getByRole('status', { name: /loading trackme/i })).toBeInTheDocument();
    expect(root(container)).toHaveAttribute('data-intro', 'playing');
  });

  it('opens the page and remembers it was seen once the opening finishes', () => {
    stubMotion();
    const { container } = renderPage();

    act(() => { screen.getByText('finish opening').click(); });

    expect(screen.queryByRole('status', { name: /loading trackme/i })).not.toBeInTheDocument();
    expect(root(container)).toHaveAttribute('data-intro', 'done');
    expect(window.sessionStorage.getItem(INTRO_KEY)).toBe('1');
  });

  it('does not replay the opening within the same session', () => {
    stubMotion();
    window.sessionStorage.setItem(INTRO_KEY, '1');
    const { container } = renderPage();

    expect(screen.queryByRole('status', { name: /loading trackme/i })).not.toBeInTheDocument();
    expect(root(container)).toHaveAttribute('data-intro', 'done');
  });

  it('skips the opening entirely for visitors who prefer reduced motion', () => {
    stubMotion({ reduce: true });
    const { container } = renderPage();

    expect(screen.queryByRole('status', { name: /loading trackme/i })).not.toBeInTheDocument();
    expect(root(container)).toHaveAttribute('data-intro', 'done');
  });

  it('skips the opening where animation is unavailable', () => {
    const { container } = renderPage();

    expect(screen.queryByRole('status', { name: /loading trackme/i })).not.toBeInTheDocument();
    expect(root(container)).toHaveAttribute('data-intro', 'done');
  });

  it('never crashes when the browser blocks session storage', () => {
    stubMotion();
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new Error('SecurityError'); } });

    try {
      expect(() => renderPage()).not.toThrow();
      expect(screen.getByRole('status', { name: /loading trackme/i })).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'sessionStorage', original);
    }
  });
});
