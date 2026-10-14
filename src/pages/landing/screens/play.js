// Helpers shared by the phone and laptop screens, which are played by scrolling.
//
// Each screen exports a `play…(tl, root, at, span)` function. It adds that screen's animation
// to a GSAP timeline between `at` and `at + span`. Anything that is a number or a word changing
// (a countdown, a typed key) is a pure `paint(progress)` function, so it runs identically
// whichever way the visitor scrolls, and can be tested without an animation library.

/** Replace a node's text, keeping the same text node so React's own reference stays valid. */
export function setText(node, value) {
  if (!node) return;
  const text = node.firstChild;
  if (text && text.nodeType === 3) {
    if (text.nodeValue !== value) text.nodeValue = value;
  } else if (node.textContent !== value) {
    node.textContent = value;
  }
}

/** Set a data attribute only when it changes, so scrubbing does not churn the DOM. */
export function setFlag(node, name, on) {
  if (!node) return;
  const value = on ? 'true' : 'false';
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/**
 * Drive `paint(0..1)` from the timeline between `at` and `at + span`. The first frame is painted
 * straight away, so the screen starts in its opening state rather than its finished one.
 */
export function scrubbed(tl, at, span, paint) {
  const state = { p: 0 };
  paint(0);
  tl.to(state, { p: 1, duration: span, ease: 'none', onUpdate: () => paint(state.p) }, at);
}
