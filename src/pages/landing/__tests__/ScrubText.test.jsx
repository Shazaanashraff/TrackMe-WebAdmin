import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScrubText } from '../ScrubText';

const SENTENCE = 'One two three four five six';

// jsdom has no layout, so tell the component where the block sits on screen.
const placeBlock = (top, height = 200) => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top, height, bottom: top + height, left: 0, right: 100, width: 100, x: 0, y: top,
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  delete window.matchMedia;
});

const opacities = () => Array.from(document.querySelectorAll('h2 span')).map((el) => Number(el.style.opacity));

describe('ScrubText', () => {
  it('keeps the whole sentence as real text for screen readers and search', () => {
    render(<ScrubText as="h2" text={SENTENCE} />);
    expect(screen.getByRole('heading', { name: SENTENCE })).toBeInTheDocument();
  });

  it('leaves every word dim while the block is still below the fold', () => {
    placeBlock(window.innerHeight + 200);
    render(<ScrubText as="h2" text={SENTENCE} />);

    expect(opacities().every((o) => o < 0.2)).toBe(true);
  });

  it('lights every word once the block has scrolled up through the reading zone', () => {
    placeBlock(-400);
    render(<ScrubText as="h2" text={SENTENCE} />);

    expect(opacities().every((o) => o === 1)).toBe(true);
  });

  it('lights the words in reading order part-way through', () => {
    // Halfway through the reading zone for a 200px block.
    placeBlock(window.innerHeight * 0.9 - (window.innerHeight * 0.4 + 200) / 2);
    render(<ScrubText as="h2" text={SENTENCE} />);

    const o = opacities();
    expect(o[0]).toBe(1);
    expect(o[o.length - 1]).toBeLessThan(0.5);
    expect(o).toEqual([...o].sort((a, b) => b - a));
  });

  it('shows everything fully lit when the visitor prefers reduced motion', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    placeBlock(window.innerHeight + 200);
    render(<ScrubText as="h2" text={SENTENCE} />);

    expect(opacities().every((o) => o === 1)).toBe(true);
  });
});
