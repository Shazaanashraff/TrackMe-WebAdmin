import { enrollStatus, keyReveal } from '../chapterMath';
import { scrubbed, setFlag, setText } from './play';

// The "join a driver" screen, as a scene: what EnrollScreen.jsx draws, and how scrolling plays it.

export const KEY = ['T', 'M', '4', 'F', '7', 'K'];
export const STEPS = ['Get the key from your driver', 'Send your request', 'Your manager approves'];

export const STATUS = {
  idle: { title: 'Not sent yet', note: 'Type the key your driver gave you.', tone: 'bg-white/30' },
  sent: { title: 'Request sent', note: 'Your driver has your request.', tone: 'bg-amber-300' },
  waiting: {
    title: 'Waiting for approval',
    note: 'This driver is private. Your fleet manager reviews every request.',
    tone: 'bg-amber-300',
  },
};

export const statusDotClass = (status) => `relative inline-flex h-2 w-2 rounded-full ${STATUS[status].tone}`;

/** Draw the screen `progress` (0..1) of the way through joining: typing, sending, waiting. */
export function paintEnroll(root, progress) {
  const typed = keyReveal(progress, KEY.length);
  const status = enrollStatus(progress);
  const sent = status !== 'idle';

  root.querySelectorAll('[data-key-box]').forEach((box, i) => {
    setFlag(box, 'data-on', i < typed);
    setText(box.querySelector('[data-key-char]'), i < typed ? KEY[i] : ' ');
  });

  setFlag(root.querySelector('[data-button]'), 'data-on', typed === KEY.length);
  setText(root.querySelector('[data-button-label]'), sent ? 'Request sent' : 'Request to join');

  const dots = root.querySelectorAll('[data-step-dot]');
  setFlag(dots[0], 'data-done', typed === KEY.length);
  setFlag(dots[1], 'data-done', sent);
  setFlag(dots[2], 'data-done', false);

  const view = STATUS[status];
  setText(root.querySelector('[data-status-title]'), view.title);
  setText(root.querySelector('[data-status-note]'), view.note);
  const dot = root.querySelector('[data-status-dot]');
  if (dot && dot.getAttribute('class') !== statusDotClass(status)) dot.setAttribute('class', statusDotClass(status));
  const ping = root.querySelector('[data-status-ping]');
  if (ping) ping.style.display = status === 'waiting' ? '' : 'none';
}

/** The key is typed, the request sent, and the screen settles on "waiting for approval". */
export function playEnroll(tl, root, at, span) {
  scrubbed(tl, at, span, (progress) => paintEnroll(root, progress));
  // The button takes a press just as the request goes out.
  const button = root.querySelector('[data-button]');
  if (button) {
    tl.to(button, { scale: 0.94, duration: span * 0.04, ease: 'power2.in' }, at + span * 0.56)
      .to(button, { scale: 1, duration: span * 0.08, ease: 'back.out(3)' }, at + span * 0.6);
  }
}
