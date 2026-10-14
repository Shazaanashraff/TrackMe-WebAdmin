import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import MapScreen from '../screens/MapScreen';
import EnrollScreen from '../screens/EnrollScreen';
import ProfilesScreen from '../screens/ProfilesScreen';
import PortalScreen from '../screens/PortalScreen';
import { awayText, etaText, paintMap, playMap, REST } from '../screens/map';
import { paintEnroll, playEnroll } from '../screens/enroll';
import { paintProfiles, playProfiles } from '../screens/profiles';
import { playPortal } from '../screens/portal';
import { scrubbed, setFlag, setText } from '../screens/play';
import { PORTAL_SHOTS } from '../config';

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
const text = (root, selector) => root.querySelector(selector).textContent;

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

describe('the rider map', () => {
  it('shows the countdown and the stops passed so far, at any point on the ride', () => {
    const root = mount(MapScreen);
    const stops = () => Array.from(root.querySelectorAll('[data-stop]')).map((s) => s.getAttribute('data-lit'));

    paintMap(root, 0);
    expect(text(root, '[data-eta-label]')).toBe('Arriving in');
    expect(text(root, '[data-eta]')).toBe('4 min');
    expect(text(root, '[data-away]')).toBe('3 stops away');
    expect(stops()).toEqual(['true', 'false', 'false', 'false']);

    paintMap(root, 0.6);
    expect(text(root, '[data-eta]')).toBe('2 min');
    expect(text(root, '[data-away]')).toBe('2 stops away');
    expect(stops()).toEqual(['true', 'true', 'false', 'false']);

    paintMap(root, 0.74);
    expect(text(root, '[data-eta]')).toBe('2 min');
    expect(text(root, '[data-away]')).toBe('1 stop away');
    expect(stops()).toEqual(['true', 'true', 'true', 'false']);
  });

  it('says the shuttle is here once it has reached the rider\'s stop', () => {
    const root = mount(MapScreen);

    paintMap(root, 1);

    expect(text(root, '[data-eta-label]')).toBe('Your shuttle is');
    expect(text(root, '[data-eta]')).toBe('Here');
    expect(text(root, '[data-away]')).toBe('At your stop');
    expect(root.querySelectorAll('[data-stop][data-lit="true"]')).toHaveLength(4);
  });

  it('draws the driven part of the route in step with the shuttle, and grows the progress bar', () => {
    const root = mount(MapScreen);

    paintMap(root, 0.25);
    expect(root.querySelector('[data-travelled]').getAttribute('stroke-dasharray')).toBe('0.2500 1');
    const quarter = parseInt(root.querySelector('[data-bar]').style.width, 10);

    paintMap(root, 0.75);
    expect(root.querySelector('[data-travelled]').getAttribute('stroke-dasharray')).toBe('0.7500 1');
    expect(parseInt(root.querySelector('[data-bar]').style.width, 10)).toBeGreaterThan(quarter);
  });

  it('moves the shuttle marker along the real route', () => {
    const root = mount(MapScreen);
    const route = root.querySelector('[data-route]');
    route.getTotalLength = () => 200;
    route.getPointAtLength = (d) => ({ x: d / 2, y: d });

    paintMap(root, 0.5);

    expect(root.querySelector('[data-marker]').getAttribute('transform')).toBe('translate(50.0 100.0)');
  });

  it('leaves the marker where it is when the browser cannot measure the route', () => {
    const root = mount(MapScreen);
    const before = root.querySelector('[data-marker]').getAttribute('transform');

    expect(() => paintMap(root, 0.5)).not.toThrow();
    expect(root.querySelector('[data-marker]').getAttribute('transform')).toBe(before);
  });

  it('rests exactly where the film would have it at that moment of the ride', () => {
    const root = mount(MapScreen);
    const resting = {
      eta: text(root, '[data-eta]'),
      away: text(root, '[data-away]'),
      lit: Array.from(root.querySelectorAll('[data-stop]')).map((s) => s.getAttribute('fill')),
      bar: root.querySelector('[data-bar]').style.width,
    };

    paintMap(root, REST.progress);

    expect(text(root, '[data-eta]')).toBe(resting.eta);
    expect(text(root, '[data-away]')).toBe(resting.away);
    expect(Array.from(root.querySelectorAll('[data-stop]')).map((s) => s.getAttribute('fill'))).toEqual(resting.lit);
    expect(root.querySelector('[data-bar]').style.width).toBe(resting.bar);
  });

  it('words the countdown and the stops in the singular and plural', () => {
    expect(etaText(4)).toBe('4 min');
    expect(etaText(1)).toBe('1 min');
    expect(etaText(0)).toBe('Here');
    expect(awayText(3)).toBe('3 stops away');
    expect(awayText(1)).toBe('1 stop away');
    expect(awayText(0)).toBe('At your stop');
  });

  it('is played by one scrubbed tween over its stretch of the film', () => {
    const root = mount(MapScreen);
    const tl = fakeTimeline();

    playMap(tl, root, 0.12, 0.76);

    expect(tl.calls).toHaveLength(1);
    expect(tl.calls[0].args[1].duration).toBe(0.76);
    expect(tl.calls[0].args[2]).toBe(0.12);
    expect(text(root, '[data-eta]')).toBe('4 min'); // painted for the opening frame straight away
  });
});

describe('the join screen', () => {
  const keyBoxes = (root) => Array.from(root.querySelectorAll('[data-key-box]'));
  const typed = (root) => keyBoxes(root).filter((b) => b.getAttribute('data-on') === 'true').length;

  it('starts empty: no key typed, nothing sent', () => {
    const root = mount(EnrollScreen);

    paintEnroll(root, 0);

    expect(typed(root)).toBe(0);
    expect(keyBoxes(root).every((b) => b.textContent.trim() === '')).toBe(true);
    expect(text(root, '[data-button-label]')).toBe('Request to join');
    expect(root.querySelector('[data-button]')).toHaveAttribute('data-on', 'false');
    expect(text(root, '[data-status-title]')).toBe('Not sent yet');
    expect(root.querySelector('[data-status-ping]').style.display).toBe('none');
    expect(root.querySelectorAll('[data-step-dot][data-done="true"]')).toHaveLength(0);
  });

  it('types the key a character at a time, in order', () => {
    const root = mount(EnrollScreen);

    paintEnroll(root, 0.27);

    const count = typed(root);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(6);
    const chars = keyBoxes(root).map((b) => b.textContent.trim());
    expect(chars.slice(0, count).join('')).toBe('TM4F7K'.slice(0, count));
    expect(chars.slice(count).every((c) => c === '')).toBe(true);
  });

  it('sends the request only once the key is complete, then waits for the manager', () => {
    const root = mount(EnrollScreen);

    paintEnroll(root, 0.5);
    expect(typed(root)).toBe(6);
    expect(root.querySelector('[data-button]')).toHaveAttribute('data-on', 'true');
    expect(text(root, '[data-button-label]')).toBe('Request to join');

    paintEnroll(root, 0.65);
    expect(text(root, '[data-button-label]')).toBe('Request sent');
    expect(text(root, '[data-status-title]')).toBe('Request sent');

    paintEnroll(root, 1);
    expect(text(root, '[data-status-title]')).toBe('Waiting for approval');
    expect(root.querySelector('[data-status-ping]').style.display).toBe('');
    // The manager's step is for the next chapter to finish.
    expect(root.querySelectorAll('[data-step-dot][data-done="true"]')).toHaveLength(2);
  });

  it('can be wound back: painting an earlier moment undoes a later one', () => {
    const root = mount(EnrollScreen);

    paintEnroll(root, 1);
    paintEnroll(root, 0);

    expect(typed(root)).toBe(0);
    expect(text(root, '[data-status-title]')).toBe('Not sent yet');
    expect(text(root, '[data-button-label]')).toBe('Request to join');
  });

  it('rests in its finished state, the same as the end of the film', () => {
    const root = mount(EnrollScreen);
    const resting = {
      typed: typed(root),
      button: text(root, '[data-button-label]'),
      status: text(root, '[data-status-title]'),
      note: text(root, '[data-status-note]'),
      done: root.querySelectorAll('[data-step-dot][data-done="true"]').length,
      dot: root.querySelector('[data-status-dot]').getAttribute('class'),
    };

    paintEnroll(root, 1);

    expect(typed(root)).toBe(resting.typed);
    expect(text(root, '[data-button-label]')).toBe(resting.button);
    expect(text(root, '[data-status-title]')).toBe(resting.status);
    expect(text(root, '[data-status-note]')).toBe(resting.note);
    expect(root.querySelectorAll('[data-step-dot][data-done="true"]')).toHaveLength(resting.done);
    expect(root.querySelector('[data-status-dot]').getAttribute('class')).toBe(resting.dot);
  });

  it('presses the button as the request goes out', () => {
    const root = mount(EnrollScreen);
    const tl = fakeTimeline();

    playEnroll(tl, root, 1, 1);

    const presses = tl.calls.filter((c) => c.args[0] === root.querySelector('[data-button]'));
    expect(presses).toHaveLength(2);
    expect(presses[0].args[1].scale).toBeLessThan(1);
    expect(presses[1].args[1].scale).toBe(1);
    expect(presses[0].args[2]).toBeLessThan(presses[1].args[2]);
  });
});

describe('the riders screen', () => {
  it('counts the second rider\'s shuttle down from six minutes to two', () => {
    const root = mount(ProfilesScreen);

    paintProfiles(root, 0);
    expect(text(root, '[data-profile-eta]')).toBe('6 min');
    const start = parseInt(root.querySelector('[data-profile-bar]').style.width, 10);

    paintProfiles(root, 1);
    expect(text(root, '[data-profile-eta]')).toBe('2 min');
    expect(parseInt(root.querySelector('[data-profile-bar]').style.width, 10)).toBeGreaterThan(start);
  });

  it('rests on the same time the film starts the countdown from', () => {
    const root = mount(ProfilesScreen);
    const resting = text(root, '[data-profile-eta]');

    paintProfiles(root, 0);

    expect(text(root, '[data-profile-eta]')).toBe(resting);
  });

  it('brings the three riders in one after another, then the add button, then the shuttle card', () => {
    const root = mount(ProfilesScreen);
    const tl = fakeTimeline();

    playProfiles(tl, root, 2, 1);

    const riders = tl.calls.find((c) => c.args[0].length === 3);
    const add = tl.calls.find((c) => c.args[0] === root.querySelector('[data-add]'));
    const shuttle = tl.calls.find((c) => c.args[0] === root.querySelector('[data-shuttle]'));
    expect(riders.args[2].stagger).toBeGreaterThan(0);
    expect(riders.args[3]).toBeLessThan(add.args[3]);
    expect(add.args[3]).toBeLessThan(shuttle.args[3]);
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
