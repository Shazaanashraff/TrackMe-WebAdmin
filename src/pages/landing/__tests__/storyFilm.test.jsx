import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { ScrollStory } from '../ScrollStory';
import { MotionContext } from '../motion/context';
import {
  CHAPTERS,
  GLIDE,
  SIDE_X_COMPACT,
  STORY_SCREENS,
  STORY_SCREENS_COMPACT,
  storyScreens,
} from '../chapterMath';
import { curtainScreens } from '../curtain';
import { STORY_SCRUB, buildStoryFilm } from '../storyFilm';
import { gsap } from '../motion/gsapSetup';

// Render the markup, but let these tests build the film themselves.
const media = vi.hoisted(() => ({ desktop: true }));
vi.mock('@/hooks/use-media-query', () => ({ useMediaQuery: () => media.desktop }));
vi.mock('../motion/useGsapContext', () => ({ useGsapContext: vi.fn() }));

const motion = { lenis: null, reduced: false, canAnimate: true, scrollTo: () => {} };

function renderStory() {
  const { container } = render(
    <MotionContext.Provider value={motion}><ScrollStory /></MotionContext.Provider>,
  );
  const section = container.querySelector('#how-it-works');
  const stage = section.querySelector('[data-story-stage]');
  const all = (selector) => Array.from(section.querySelectorAll(selector));
  return {
    section,
    stage,
    all,
    one: (selector) => section.querySelector(selector),
    device: section.querySelector('[data-device]'),
    phone: section.querySelector('[data-phone]'),
    laptop: section.querySelector('[data-laptop]'),
    copies: all('[data-copy]'),
    screens: all('[data-screen]'),
    segments: all('[data-seg]'),
  };
}

const opacity = (el) => Number(gsap.getProperty(el, 'opacity'));
const x = (el) => Number(gsap.getProperty(el, 'xPercent'));
const text = (el, selector) => el.querySelector(selector).textContent;

describe('the story film, played by hand', () => {
  let story;
  let film;

  beforeEach(() => { media.desktop = true; });

  // `time(t, false)` moves the playhead like a scrub would, with callbacks firing.
  const at = (t) => film.time(t, false);

  beforeEach(() => {
    story = renderStory();
    film = buildStoryFilm(story.section, story.stage, { detached: true });
  });

  afterEach(() => { film.kill(); });

  it('sways a phone between chapters when given the compact sides, and changes sides otherwise', () => {
    const detached = (sideX) => {
      const swayed = buildStoryFilm(story.section, story.stage, { detached: true, sideX });
      swayed.time(1.5, false);
      const value = Number(gsap.getProperty(story.device, 'xPercent'));
      swayed.kill();
      return value;
    };

    expect(detached(undefined)).toBe(100);
    expect(detached(SIDE_X_COMPACT)).toBe(SIDE_X_COMPACT[1]);
  });

  it('runs for exactly one unit per chapter, so scroll progress maps straight onto chapters', () => {
    expect(film.duration()).toBeCloseTo(CHAPTERS);
  });

  it('opens on chapter one: the phone at the left showing the map, and only its copy visible', () => {
    at(0);

    expect(x(story.device)).toBe(0);
    expect(opacity(story.copies[0])).toBeGreaterThan(0.99);
    story.copies.slice(1).forEach((copy) => expect(opacity(copy)).toBe(0));
    expect(opacity(story.screens[0])).toBeGreaterThan(0.99);
    expect(opacity(story.screens[1])).toBe(0);
    expect(opacity(story.screens[2])).toBe(0);
    expect(opacity(story.laptop)).toBe(0);
  });

  it.each([
    [0.5, 0, 0],
    [1.5, 100, 1],
    [2.5, 0, 2],
    [3.5, 100, 3],
  ])('at %s the device is %s%% across, and chapter %s is the one on show', (time, side, chapter) => {
    at(time);

    expect(x(story.device)).toBeCloseTo(side, 0);
    story.copies.forEach((copy, i) => {
      if (i === chapter) expect(opacity(copy)).toBeGreaterThan(0.99);
      else expect(opacity(copy)).toBeLessThan(0.01);
    });
  });

  it('shows the matching phone screen in each phone chapter', () => {
    [0.5, 1.5, 2.5].forEach((time, chapter) => {
      at(time);
      story.screens.forEach((screen, i) => {
        if (i === chapter) expect(opacity(screen)).toBeGreaterThan(0.99);
        else expect(opacity(screen)).toBeLessThan(0.01);
      });
    });
  });

  it('glides the device across the boundary: half way over at the boundary itself', () => {
    at(1 - GLIDE - 0.001);
    expect(x(story.device)).toBeLessThan(2);

    at(1);
    expect(x(story.device)).toBeGreaterThan(40);
    expect(x(story.device)).toBeLessThan(60);

    at(1 + GLIDE + 0.001);
    expect(x(story.device)).toBeGreaterThan(98);
  });

  it('lets the old copy go before the new copy is shown, never two at once', () => {
    at(0.9); // the old copy is lifting away
    expect(opacity(story.copies[0])).toBeGreaterThan(0);
    expect(opacity(story.copies[0])).toBeLessThan(1);
    expect(opacity(story.copies[1])).toBe(0);

    at(1.0); // handed over
    expect(opacity(story.copies[0])).toBe(0);
    expect(opacity(story.copies[1])).toBe(1);
  });

  it('keeps each chapter\'s title words hidden behind their masks until the chapter arrives', () => {
    const words = (i) => Array.from(story.copies[i].querySelectorAll('[data-tw]'));

    at(0.5);
    words(1).forEach((word) => expect(Number(gsap.getProperty(word, 'yPercent'))).toBe(115));

    at(1.6);
    words(1).forEach((word) => expect(Number(gsap.getProperty(word, 'yPercent'))).toBe(0));
  });

  it('turns the phone into a laptop in the last chapter', () => {
    at(2.5);
    expect(opacity(story.phone)).toBeGreaterThan(0.99);
    expect(opacity(story.laptop)).toBe(0);

    at(3.5);
    expect(opacity(story.phone)).toBe(0);
    expect(opacity(story.laptop)).toBeGreaterThan(0.99);
  });

  it('drives the shuttle along its route, counting the arrival down as it goes', () => {
    const route = story.one('[data-route]');
    route.getTotalLength = () => 100;
    route.getPointAtLength = (distance) => ({ x: distance, y: distance * 2 });
    film.kill();
    film = buildStoryFilm(story.section, story.stage, { detached: true });
    const map = story.screens[0];

    at(0.2);
    expect(text(map, '[data-eta]')).toBe('4 min');
    expect(text(map, '[data-away]')).toBe('3 stops away');
    expect(map.querySelector('[data-marker]').getAttribute('transform')).toBe('translate(0.0 0.0)');

    at(0.56); // 60% of the way through the chapter's content
    expect(text(map, '[data-eta]')).toBe('2 min');
    expect(map.querySelector('[data-marker]').getAttribute('transform')).toBe('translate(60.0 120.0)');
    expect(map.querySelector('[data-travelled]').getAttribute('stroke-dasharray')).toBe('0.6000 1');

    at(0.9); // the content has finished: the shuttle is at the rider's stop
    expect(text(map, '[data-eta]')).toBe('Here');
    expect(text(map, '[data-away]')).toBe('At your stop');
  });

  it('types the driver key, sends the request, then waits for the manager', () => {
    const join = story.screens[1];
    const boxes = () => Array.from(join.querySelectorAll('[data-key-box]')).map((box) => box.getAttribute('data-on'));

    at(1.12);
    expect(boxes()).toEqual(Array(6).fill('false'));
    expect(text(join, '[data-status-title]')).toBe('Not sent yet');

    at(1.5); // the whole key is in, nothing sent yet
    expect(boxes()).toEqual(Array(6).fill('true'));
    expect(text(join, '[data-key-box]:first-child')).toBe('T');
    expect(text(join, '[data-button-label]')).toBe('Request to join');
    expect(text(join, '[data-status-title]')).toBe('Not sent yet');

    at(1.88);
    expect(text(join, '[data-button-label]')).toBe('Request sent');
    expect(text(join, '[data-status-title]')).toBe('Waiting for approval');
    expect(join.querySelectorAll('[data-step-dot][data-done="true"]')).toHaveLength(2); // the manager step is still to come
  });

  it('adds riders one at a time and closes the second rider\'s shuttle in', () => {
    const riders = story.screens[2];
    const eta = () => text(riders, '[data-profile-eta]');

    at(2.12);
    expect(eta()).toBe('6 min');
    expect(opacity(riders.querySelectorAll('[data-rider]')[2])).toBe(0);

    at(2.5);
    riders.querySelectorAll('[data-rider]').forEach((rider) => expect(opacity(rider)).toBeGreaterThan(0.99));

    at(2.88);
    expect(eta()).toBe('2 min');
  });

  it('changes the portal page as you scroll, ending on the approvals queue with a request approved', () => {
    const shots = story.all('[data-shot]');
    const toast = story.one('[data-toast]');

    at(3.12);
    expect(opacity(shots[0])).toBeGreaterThan(0.99);
    expect(opacity(shots[3])).toBe(0);
    expect(opacity(toast)).toBe(0);

    at(3.88);
    shots.forEach((shot) => expect(opacity(shot)).toBeGreaterThan(0.99)); // each sits over the last
    expect(opacity(toast)).toBeGreaterThan(0.99);
  });

  it('fills each chapter\'s progress bar as its chapter plays, one after another', () => {
    const fill = (i) => Number(gsap.getProperty(story.segments[i], 'scaleX'));

    at(0.5);
    expect(fill(0)).toBeCloseTo(0.5);
    expect(fill(1)).toBe(0);

    at(1.5);
    expect(fill(0)).toBe(1);
    expect(fill(1)).toBeCloseTo(0.5);

    at(CHAPTERS);
    story.segments.forEach((_, i) => expect(fill(i)).toBe(1));
  });

  it('plays backwards too: scrolling back to the top restores the opening exactly', () => {
    at(3.9);
    at(0);

    expect(x(story.device)).toBe(0);
    expect(opacity(story.copies[0])).toBeGreaterThan(0.99);
    expect(opacity(story.copies[3])).toBe(0);
    expect(opacity(story.laptop)).toBe(0);
    expect(opacity(story.phone)).toBeGreaterThan(0.99);
    expect(text(story.screens[0], '[data-eta]')).toBe('4 min');
    expect(text(story.screens[1], '[data-status-title]')).toBe('Not sent yet');
    expect(text(story.screens[2], '[data-profile-eta]')).toBe('6 min');
  });
});

describe('the story film, pinned to the page', () => {
  let story;
  let config;
  let fromTo;

  beforeEach(() => {
    media.desktop = true;
    story = renderStory();
    const timeline = new Proxy({}, { get: () => () => timeline });
    vi.spyOn(gsap, 'timeline').mockImplementation((vars) => { config = vars; return timeline; });
    fromTo = vi.spyOn(gsap, 'fromTo').mockReturnValue(null);
  });

  afterEach(() => { vi.restoreAllMocks(); });

  const withWidth = (width, run) => {
    const before = window.innerWidth;
    try {
      window.innerWidth = width;
      run();
    } finally {
      window.innerWidth = before;
    }
  };

  it('pins the stage and scrubs the film across the story screens plus the curtain, measured again on every refresh', () => {
    withWidth(1280, () => {
      buildStoryFilm(story.section, story.stage, { onStep: () => {} });
      const trigger = config.scrollTrigger;

      expect(trigger.trigger).toBe(story.section);
      expect(trigger.pin).toBe(story.stage);
      expect(trigger.start).toBe('top top');
      expect(trigger.scrub).toBe(STORY_SCRUB);
      expect(trigger.invalidateOnRefresh).toBe(true);
      expect(trigger.end()).toBe(`+=${Math.round(window.innerHeight * (STORY_SCREENS + curtainScreens(1280)))}`);
    });
  });

  it('is shorter on a phone: a thumb covers less ground than a wheel', () => {
    expect(storyScreens(1280)).toBe(STORY_SCREENS);
    expect(storyScreens(390)).toBe(STORY_SCREENS_COMPACT);
    expect(STORY_SCREENS_COMPACT).toBeLessThan(STORY_SCREENS);
    withWidth(390, () => {
      buildStoryFilm(story.section, story.stage, { onStep: () => {} });
      expect(config.scrollTrigger.end()).toBe(`+=${Math.round(window.innerHeight * (STORY_SCREENS_COMPACT + curtainScreens(390)))}`);
    });
  });

  it('is measured after the hero pin and before every other trigger, so the story never starts early', () => {
    buildStoryFilm(story.section, story.stage, { onStep: () => {} });
    expect(config.scrollTrigger.refreshPriority).toBe(1);
  });

  it('reports the chapter the visitor is in as the film plays', () => {
    withWidth(1280, () => {
      const onStep = vi.fn();
      buildStoryFilm(story.section, story.stage, { onStep });
      const { onUpdate } = config.scrollTrigger;
      // Scroll progress runs over the film AND the curtain; the chapter is read off the film's part.
      const raw = (film) => (film * STORY_SCREENS) / (STORY_SCREENS + curtainScreens(1280));

      [[0, 0], [0.24, 0], [0.26, 1], [0.6, 2], [0.99, 3], [1, 3]].forEach(([film, step]) => {
        onUpdate({ progress: raw(film) });
        expect(onStep).toHaveBeenLastCalledWith(step);
      });
      onUpdate({ progress: 1 }); // all the way down, through the curtain: still the last chapter
      expect(onStep).toHaveBeenLastCalledWith(3);
    });
  });

  it('lifts the first chapter\'s words as the section scrolls into view, before the pin takes hold', () => {
    buildStoryFilm(story.section, story.stage, {});
    const intro = fromTo.mock.calls.filter(([, , vars]) => vars.scrollTrigger);

    expect(intro.length).toBeGreaterThan(0);
    intro.forEach(([, , vars]) => {
      expect(vars.scrollTrigger.trigger).toBe(story.section);
      expect(vars.scrollTrigger.start).toBe('top 72%');
    });
  });

  it('plays no intro in a detached film', () => {
    buildStoryFilm(story.section, story.stage, { detached: true });
    expect(fromTo).not.toHaveBeenCalled();
    expect(config.paused).toBe(true);
    expect(config.scrollTrigger).toBeUndefined();
  });
});
