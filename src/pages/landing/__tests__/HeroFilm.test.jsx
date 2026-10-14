import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { HeroFilm } from '../HeroFilm';
import { HERO_VIDEO } from '../config';
import { coverGeometry } from '../heroVideo';

const clip = HERO_VIDEO.wide;
const box = coverGeometry(1440, 900, clip.width, clip.height);
const renderFilm = (props = {}) => render(
  <HeroFilm clip={clip} animated box={box} {...props} />,
);

let play;
let pause;
beforeEach(() => {
  play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  pause = vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('HeroFilm (the clip)', () => {
  it('is a muted, looping, inline video that starts by itself, with the poster to show meanwhile', () => {
    const { container } = renderFilm();
    const video = container.querySelector('video');

    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video).toHaveAttribute('poster', clip.poster);
    expect(video).not.toHaveAttribute('controls');
    expect(container.querySelector('source')).toHaveAttribute('src', clip.src);
    expect(container.querySelector('source')).toHaveAttribute('type', 'video/mp4');
  });

  it('is decoration: hidden from assistive technology, since the headline says everything', () => {
    const { container } = renderFilm();
    expect(container.querySelector('video')).toHaveAttribute('aria-hidden', 'true');
  });

  it('sits at its full covered size on the stage, so what is cropped off can still slide into view', () => {
    const { container } = renderFilm();
    const { style } = container.querySelector('video');

    expect(style.left).toBe(`${box.left}px`);
    expect(style.top).toBe(`${box.top}px`);
    expect(style.width).toBe(`${box.width}px`);
    expect(style.height).toBe(`${box.height}px`);
  });

  it('plays the file it was given, and starts afresh when that changes (a phone gets the portrait cut)', () => {
    const { container, rerender } = renderFilm();
    const first = container.querySelector('video');

    rerender(<HeroFilm clip={HERO_VIDEO.tall} animated box={box} />);

    const second = container.querySelector('video');
    expect(second).not.toBe(first);
    expect(container.querySelector('source')).toHaveAttribute('src', HERO_VIDEO.tall.src);
    expect(second).toHaveAttribute('poster', HERO_VIDEO.tall.poster);
  });

  it('asks to play once mounted, with the sound off, and shrugs off a browser that says no', async () => {
    play.mockRejectedValue(new Error('blocked'));
    const { container } = renderFilm();

    expect(play).toHaveBeenCalled();
    expect(container.querySelector('video').muted).toBe(true);
    await Promise.resolve(); // an unhandled rejection would fail the run
  });
});

describe('HeroFilm (reduced motion)', () => {
  it('shows only the still: no video element at all, so nothing downloads or plays', () => {
    const { container } = renderFilm({ animated: false });

    expect(container.querySelector('video')).toBeNull();
    const poster = container.querySelector('img');
    expect(poster).toHaveAttribute('src', clip.still);
    expect(poster).toHaveAttribute('alt', '');
    expect(poster).toHaveAttribute('aria-hidden', 'true');
    expect(play).not.toHaveBeenCalled();
  });
});

describe('HeroFilm (off screen)', () => {
  let callback;
  let disconnect;
  let observed;

  beforeEach(() => {
    callback = null;
    observed = [];
    disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb) { callback = cb; }
      observe(el) { observed.push(el); }
      disconnect() { disconnect(); }
    });
  });

  const watched = () => {
    const ref = createRef();
    const stage = document.createElement('div');
    ref.current = stage;
    return { ref, stage };
  };

  it('pauses when the hero scrolls out of view and plays again when it returns', () => {
    const { ref, stage } = watched();
    renderFilm({ watch: ref });
    expect(observed).toEqual([stage]);

    play.mockClear();
    callback([{ isIntersecting: false }]);
    expect(pause).toHaveBeenCalledTimes(1);

    callback([{ isIntersecting: true }]);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('stops watching when it leaves the page', () => {
    const { ref } = watched();
    const { unmount } = renderFilm({ watch: ref });

    unmount();

    expect(disconnect).toHaveBeenCalled();
  });

  it('simply plays on where nothing can report visibility', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { ref } = watched();

    expect(() => renderFilm({ watch: ref })).not.toThrow();
    expect(play).toHaveBeenCalled();
  });
});
