import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { ScrollStory } from '../ScrollStory';
import { MotionContext } from '../motion/context';
import { STORY } from '../config';
import { SIDE_X, SIDE_X_COMPACT } from '../chapterMath';
import { buildStoryFilm } from '../storyFilm';

const media = vi.hoisted(() => ({ desktop: true }));
vi.mock('@/hooks/use-media-query', () => ({ useMediaQuery: () => media.desktop }));
vi.mock('../storyFilm', () => ({ buildStoryFilm: vi.fn() }));

const renderStory = ({ reduced = false } = {}) => render(
  <MotionContext.Provider value={{ lenis: null, reduced, canAnimate: !reduced, scrollTo: () => {} }}>
    <ScrollStory />
  </MotionContext.Provider>,
);

const section = (container) => container.querySelector('#how-it-works');
// What the film is told about: the callback it reports the current chapter through.
const reportStep = (step) => act(() => { buildStoryFilm.mock.calls.at(-1)[2].onStep(step); });

beforeEach(() => {
  media.desktop = true;
  vi.clearAllMocks();
});

describe('ScrollStory (the pinned film)', () => {
  it('pins a stage on a wide screen and hands the film its section and stage', () => {
    const { container } = renderStory();
    const stage = container.querySelector('[data-story-stage]');

    expect(stage).not.toBeNull();
    expect(buildStoryFilm).toHaveBeenCalledTimes(1);
    const [sectionEl, stageEl, options] = buildStoryFilm.mock.calls[0];
    expect(sectionEl).toBe(section(container));
    expect(stageEl).toBe(stage);
    expect(typeof options.onStep).toBe('function');
    expect(options.sideX).toEqual(SIDE_X); // the device changes sides
  });

  it('starts on chapter one, with the device on the left', () => {
    const { container } = renderStory();

    expect(section(container)).toHaveAttribute('data-step', '0');
    expect(section(container)).toHaveAttribute('data-side', 'left');
    expect(screen.getByText('01 / 04')).toBeInTheDocument();
  });

  it('follows the film from chapter to chapter: step, side, counter and progress', () => {
    const { container } = renderStory();

    reportStep(1);
    expect(section(container)).toHaveAttribute('data-step', '1');
    expect(section(container)).toHaveAttribute('data-side', 'right');
    expect(screen.getByText('02 / 04')).toBeInTheDocument();

    reportStep(2);
    expect(section(container)).toHaveAttribute('data-side', 'left');

    reportStep(3);
    expect(section(container)).toHaveAttribute('data-side', 'right');
    expect(screen.getByText('04 / 04')).toBeInTheDocument();

    const progress = within(screen.getByRole('list', { name: 'Progress' }));
    const current = progress.getAllByRole('listitem').filter((item) => item.getAttribute('aria-current') === 'step');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(STORY[3].title);
  });

  it('keeps only the chapter on show in the accessibility tree', () => {
    const { container } = renderStory();
    const copies = () => Array.from(container.querySelectorAll('[data-copy]'));

    expect(copies()).toHaveLength(STORY.length);
    expect(copies().map((c) => c.getAttribute('aria-hidden'))).toEqual(['false', 'true', 'true', 'true']);

    reportStep(2);
    expect(copies().map((c) => c.getAttribute('aria-hidden'))).toEqual(['true', 'true', 'false', 'true']);
    expect(screen.getByRole('heading', { level: 3, name: STORY[2].title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: STORY[0].title })).toBeNull();
  });

  it('still reads each title as plain words, though every word sits behind its own mask', () => {
    const { container } = renderStory();

    const titles = Array.from(container.querySelectorAll('[data-copy] h3')).map((h) => h.textContent);
    expect(titles).toEqual(STORY.map((s) => s.title));
    container.querySelectorAll('[data-copy] h3').forEach((h) => {
      expect(h.querySelectorAll('[data-tw]').length).toBeGreaterThan(1);
    });
  });

  it('puts every phone screen in the phone and the portal in a laptop beside it, all waiting for the film', () => {
    const { container } = renderStory();

    expect(container.querySelectorAll('[data-phone] [data-screen]')).toHaveLength(3);
    expect(container.querySelector('[data-laptop] [data-portal]')).not.toBeNull();
    // Only the first screen starts visible; the film brings in the rest.
    const screens = Array.from(container.querySelectorAll('[data-screen]'));
    expect(screens.map((s) => s.classList.contains('opacity-0'))).toEqual([false, true, true]);
    expect(container.querySelector('[data-laptop]')).toHaveClass('opacity-0');
  });

  it('gives each chapter a progress bar for the film to fill', () => {
    const { container } = renderStory();
    expect(container.querySelectorAll('[data-seg]')).toHaveLength(STORY.length);
  });

  it('has no CSS transitions on what the film moves, so GSAP is the only thing in charge', () => {
    const { container } = renderStory();
    const moved = container.querySelectorAll('[data-device], [data-phone], [data-laptop], [data-copy], [data-screen]');

    expect(moved.length).toBeGreaterThan(0);
    moved.forEach((el) => expect(el.className).not.toMatch(/transition|duration-/));
  });
});

describe('ScrollStory (the pinned film on a phone)', () => {
  beforeEach(() => { media.desktop = false; });

  it('pins the same film on a phone, with the device swaying instead of changing sides', () => {
    const { container } = renderStory();

    expect(container.querySelector('[data-story-stage]')).not.toBeNull();
    expect(buildStoryFilm).toHaveBeenCalledTimes(1);
    expect(buildStoryFilm.mock.calls[0][2].sideX).toEqual(SIDE_X_COMPACT);
    expect(SIDE_X_COMPACT.every((x) => Math.abs(x) <= 12)).toBe(true); // a sway, not a swap
  });

  it('stands the device above its copy, across the whole width, rather than beside it', () => {
    const { container } = renderStory();
    const device = container.querySelector('[data-device]');

    expect(device.className).toMatch(/inset-x-0/);
    expect(device.className).not.toMatch(/w-1\/2/);
    container.querySelectorAll('[data-copy]').forEach((copy) => {
      expect(copy.className).toMatch(/inset-x-0/);
      expect(copy.className).toMatch(/bottom-14/);
      expect(copy.className).not.toMatch(/w-1\/2/);
    });
  });

  it('draws no giant outlined chapter numbers behind the copy on a phone', () => {
    const { container } = renderStory();
    expect(container.querySelectorAll('[data-copy] .l-outline')).toHaveLength(0);
  });

  it('draws the phone at a fixed width and scales the whole picture, never squeezing its screens', () => {
    const { container } = renderStory();
    const frame = container.querySelector('[data-phone] [class*="aspect-"]');

    expect(frame.className).toMatch(/\bw-full\b/);
    const scaler = frame.parentElement;
    expect(scaler.style.width).toBe('246px');
    expect(scaler.style.transform).toMatch(/^scale\(/);
    expect(scaler.style.transformOrigin).toMatch(/^0(px)? 0(px)?$/);
  });

  it('still tells every chapter and keeps the portal in the laptop', () => {
    const { container } = renderStory();

    const titles = Array.from(container.querySelectorAll('[data-copy] h3')).map((h) => h.textContent);
    expect(titles).toEqual(STORY.map((item) => item.title));
    expect(container.querySelector('[data-laptop] [data-portal]')).not.toBeNull();
  });
});

describe('ScrollStory (without the film)', () => {
  it('shows plain, stacked chapters for visitors who prefer reduced motion, even on a wide screen', () => {
    const { container } = renderStory({ reduced: true });

    expect(container.querySelector('[data-story-stage]')).toBeNull();
    expect(buildStoryFilm).not.toHaveBeenCalled();
    expect(section(container)).not.toHaveAttribute('data-step');
    STORY.forEach((item) => {
      expect(screen.getByRole('heading', { level: 3, name: item.title })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { level: 2, name: /roadside to control room/i })).toBeInTheDocument();
  });

  it('shows the same plain chapters on a narrow screen, and plays nothing', () => {
    media.desktop = false;
    const { container } = renderStory({ reduced: true });

    expect(container.querySelector('[data-story-stage]')).toBeNull();
    expect(buildStoryFilm).not.toHaveBeenCalled();
    STORY.forEach((item) => {
      expect(screen.getByRole('heading', { level: 3, name: item.title })).toBeInTheDocument();
    });
  });

  it('leaves the plain titles unmasked and unmarked: there is nothing to play', () => {
    media.desktop = false;
    const { container } = renderStory({ reduced: true });

    expect(container.querySelectorAll('[data-tw]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-chapter], [data-stack-device], [data-stack-screen]')).toHaveLength(0);
  });

  it('tilts the phones in alternating directions in CSS, and stands them straight from the small breakpoint up', () => {
    media.desktop = false;
    const { container } = renderStory({ reduced: true });
    const frames = Array.from(container.querySelectorAll('[class*="aspect-"]')).filter((el) => /rotate-3/.test(el.className));

    expect(frames).toHaveLength(3);
    expect(frames.map((f) => f.className.includes('-rotate-3'))).toEqual([true, false, true]);
    frames.forEach((f) => expect(f.className).toMatch(/sm:rotate-0/));
  });

  it('lays the chapters out as alternating rows when a wide screen asked for less motion', () => {
    const { container } = renderStory({ reduced: true });
    const copies = Array.from(container.querySelectorAll('div.lg\\:px-6'));

    expect(copies).toHaveLength(STORY.length);
    // The device sits left on even chapters and right on odd ones, as in the film.
    expect(copies.map((c) => c.classList.contains('lg:order-2'))).toEqual([true, false, true, false]);
  });

  it('shows the real portal pages in the last chapter', () => {
    media.desktop = false;
    renderStory({ reduced: true });
    const images = screen.getAllByRole('img', { hidden: true });
    expect(images.some((img) => /enrollment queue/i.test(img.alt))).toBe(true);
  });
});
