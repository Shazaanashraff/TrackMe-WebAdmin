// How a real app screenshot plays inside the phone while its chapter runs: a slow, steady push in
// from the top (just 2%, so the app's bottom bar stays in view) (the picture is a still, so the move is what keeps the chapter alive).

/** Add the push in to a timeline between `at` and `at + span`. */
export function playShot(tl, root, at, span) {
  const picture = root.querySelector('[data-app-shot]');
  if (!picture) return;
  tl.fromTo(picture, { scale: 1 }, { scale: 1.02, ease: 'none', duration: span, transformOrigin: '50% 0%' }, at);
}
