import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import AppScreen from '../screens/AppScreen';
import PortalScreen from '../screens/PortalScreen';
import { playShot } from '../screens/shot';
import { playPortal } from '../screens/portal';
import { scrubbed, setFlag, setText } from '../screens/play';
import { APP_SHOTS, PORTAL_SHOTS } from '../config';

// A timeline stand-in that records what was added to it.
function fakeTimeline() {
  const calls = [];
  const tl = {};
  ['to', 'fromTo'].forEach((method) => {
    tl[method] = vi.fn((...args) => { calls.push({ method, args }); return tl; });
  });
  tl.calls = calls;
  return tl;
}

const mount = (Screen, props) => render(<Screen {...props} />).container.firstChild;

describe('play helpers', () => {
  it('setText changes the words but keeps the same text node, so React is never confused', () => {
    const p = document.createElement('p');
    p.textContent = 'before';
    const node = p.firstChild;

    setText(p, 'after');

    expect(p.textContent).toBe('after');
    expect(p.firstChild).toBe(node);
  });

  it('setText fills an empty element and tolerates a missing one', () => {
    const p = document.createElement('p');
    setText(p, 'filled');
    expect(p.textContent).toBe('filled');
    expect(() => setText(null, 'x')).not.toThrow();
  });

  it('setFlag writes "true" or "false", and only when the value changes', () => {
    const el = document.createElement('div');
    const set = vi.spyOn(el, 'setAttribute');

    setFlag(el, 'data-on', true);
    setFlag(el, 'data-on', true);
    setFlag(el, 'data-on', false);

    expect(el.getAttribute('data-on')).toBe('false');
    expect(set).toHaveBeenCalledTimes(2);
    expect(() => setFlag(null, 'data-on', true)).not.toThrow();
  });

  it('scrubbed paints the opening frame at once, then again from the timeline as it plays', () => {
    const tl = fakeTimeline();
    const paint = vi.fn();

    scrubbed(tl, 2, 0.5, paint);

    expect(paint).toHaveBeenCalledTimes(1);
    expect(paint).toHaveBeenCalledWith(0);
    const [state, vars, position] = tl.calls[0].args;
    expect(vars.duration).toBe(0.5);
    expect(vars.ease).toBe('none');
    expect(position).toBe(2);

    state.p = 0.4;
    vars.onUpdate();
    expect(paint).toHaveBeenLastCalledWith(0.4);
  });
});

describe('the app screens (real captures of the driver app)', () => {
  it('shows each capture as a picture that fills the phone, with a description of what it is', () => {
    APP_SHOTS.forEach((shot, i) => {
      const root = mount(AppScreen, { shot: i });
      const img = root.querySelector('img[data-app-shot]');

      expect(img).toHaveAttribute('src', shot.src);
      expect(img.alt).toBe(shot.alt);
      expect(img.alt.length).toBeGreaterThan(20);
      expect(img).toHaveAttribute('draggable', 'false');
      expect(root.querySelector('[class*="top-[26px]"]')).not.toBeNull(); // sits below the camera notch
      expect(root.style.backgroundColor).not.toBe(''); // the strip above it takes the picture's own colour
    });
  });

  it('has three captures: the home screen, the profile with the enrollment key, and the riders', () => {
    expect(APP_SHOTS.map((s) => s.key)).toEqual(['home', 'profile', 'riders']);
    APP_SHOTS.forEach((s) => expect(s.src).toMatch(/^\/landing\/app-[a-z]+\.webp$/));
  });

  it('pushes the picture in a very little while its chapter plays, so the bottom bar stays in view', () => {
    const root = mount(AppScreen, { shot: 1 });
    const tl = fakeTimeline();
    playShot(tl, root, 1.2, 0.6);

    const [target, from, to] = tl.calls[0].args;
    expect(target).toBe(root.querySelector('[data-app-shot]'));
    expect(from.scale).toBe(1);
    expect(to.scale).toBeGreaterThan(1);
    expect(to.scale).toBeLessThanOrEqual(1.03);
    expect(to.duration).toBe(0.6);
    expect(tl.calls[0].args[3]).toBe(1.2);
  });

  it('does nothing for a screen that has no picture', () => {
    const tl = fakeTimeline();
    playShot(tl, document.createElement('div'), 0, 1);
    expect(tl.calls).toHaveLength(0);
  });
});

describe('the manager portal', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('cycles the pages on its own by default', () => {
    vi.useFakeTimers();
    const { container } = render(<PortalScreen />);
    const visible = () => Array.from(container.querySelectorAll('img')).findIndex((img) => img.className.includes('opacity-100'));

    expect(visible()).toBe(0);
    act(() => { vi.advanceTimersByTime(3700); });
    expect(visible()).toBe(1);
  });

  it('holds still when the film is playing it, with a toast waiting to be shown', () => {
    vi.useFakeTimers();
    const { container } = render(<PortalScreen scrubbed />);
    const classes = () => Array.from(container.querySelectorAll('img')).map((img) => img.className);
    const before = classes();

    act(() => { vi.advanceTimersByTime(20000); });

    expect(classes()).toEqual(before);
    expect(container.querySelector('[data-toast]')).toHaveTextContent(/join request approved/i);
    expect(container.querySelector('[data-toast]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no toast when it is not being played by the film', () => {
    const { container } = render(<PortalScreen />);
    expect(container.querySelector('[data-toast]')).toBeNull();
  });

  it('fades each page in over the last, one slice of the chapter apart, and ends on the toast', () => {
    const { container } = render(<PortalScreen scrubbed />);
    const root = container.firstChild;
    const tl = fakeTimeline();

    playPortal(tl, root, 3, 1);

    const shots = Array.from(root.querySelectorAll('[data-shot]'));
    const fades = shots.slice(1).map((shot) => tl.calls.find((c) => c.args[0] === shot));
    expect(fades).toHaveLength(PORTAL_SHOTS.length - 1);
    const starts = fades.map((c) => c.args[3]);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    expect(new Set(starts).size).toBe(starts.length);

    const toast = tl.calls.find((c) => c.args[0] === root.querySelector('[data-toast]'));
    expect(toast.args[3]).toBeGreaterThan(starts.at(-1));
  });
});
