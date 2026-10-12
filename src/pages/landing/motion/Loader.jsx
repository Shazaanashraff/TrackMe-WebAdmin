import { useEffect, useRef } from 'react';
import { EASE, gsap } from './gsapSetup';
import { useMotion } from './context';
import { INTRO_MAX_MS, irisOrigin, padCount } from './intro';

const WORD = 'TrackMe'.split('');
const ROUTE = 'M10 112 C 130 112, 170 36, 290 56 S 470 128, 550 66 S 690 14, 790 34';
// How far along the route (0..1) each stop lights up.
const STOPS = [
  { at: 0.04, x: 10, y: 112 },
  { at: 0.52, x: 420, y: 92 },
  { at: 0.98, x: 790, y: 34 },
];

/**
 * The opening: a route draws itself under the wordmark while a counter runs to
 * 100, then the page is revealed through a circle that grows from where the
 * shuttle will be, a radar ping. It locks scrolling while it plays and can
 * never run longer than INTRO_MAX_MS.
 */
export function Loader({ onDone }) {
  const rootRef = useRef(null);
  const pathRef = useRef(null);
  const dotRef = useRef(null);
  const counterRef = useRef(null);
  const { lenis } = useMotion();

  // No scrolling while the opening plays.
  useEffect(() => {
    lenis?.stop();
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previous;
      lenis?.start();
    };
  }, [lenis]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onDone();
    };
    const failsafe = window.setTimeout(finish, INTRO_MAX_MS);

    const path = pathRef.current;
    const length = typeof path?.getTotalLength === 'function' ? path.getTotalLength() : 1000;
    const state = { v: 0 };
    const stops = root.querySelectorAll('[data-stop]');

    const render = () => {
      const progress = state.v / 100;
      if (counterRef.current) counterRef.current.textContent = padCount(state.v);
      if (path) {
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length * (1 - progress)}`;
        if (dotRef.current && typeof path.getPointAtLength === 'function') {
          const point = path.getPointAtLength(length * progress);
          dotRef.current.setAttribute('cx', point.x);
          dotRef.current.setAttribute('cy', point.y);
        }
      }
      stops.forEach((stop, i) => {
        stop.style.opacity = progress >= STOPS[i].at ? '1' : '0.25';
      });
    };

    const ctx = gsap.context(() => {
      render();
      const tl = gsap.timeline({ onComplete: finish });
      tl.from(root.querySelectorAll('[data-letter]'), { yPercent: 115, duration: 0.9, ease: EASE.out, stagger: 0.05 }, 0)
        .to(state, { v: 100, duration: 1.7, ease: 'power2.inOut', onUpdate: render }, 0.15)
        .to(root.querySelector('[data-content]'), { opacity: 0, duration: 0.45, ease: EASE.soft }, '+=0.2')
        .to(root, { '--r': '112%', duration: 1.1, ease: EASE.inOut }, '<');
    }, root);

    return () => {
      window.clearTimeout(failsafe);
      ctx.revert();
    };
  }, [onDone]);

  const origin = irisOrigin(window.innerWidth, window.innerHeight);

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label="Loading TrackMe"
      className="l-loader fixed inset-0 z-[100] bg-l-ink text-l-bone"
      style={{ '--x': `${origin.x}%`, '--y': `${origin.y}%`, '--r': '0%' }}
    >
      <div data-content className="relative flex h-full w-full flex-col justify-between p-5 sm:p-10">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.25em] text-l-bone/60">
          <span>TrackMe</span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-l-teal" style={{ animation: 'l-ping 1.8s ease-out infinite' }} />
            Live shuttle tracking
          </span>
        </div>

        <div className="mx-auto w-full max-w-5xl">
          <h1
            aria-hidden="true"
            className="font-display flex justify-center overflow-hidden text-[clamp(4rem,15vw,12rem)] font-semibold leading-[0.95]"
          >
            {WORD.map((letter, i) => (
              <span key={`${letter}-${i}`} data-letter className="inline-block">{letter}</span>
            ))}
          </h1>
          <svg viewBox="0 0 800 150" className="mt-6 h-auto w-full" fill="none" aria-hidden="true">
            <path d={ROUTE} stroke="rgb(239 234 223 / 0.14)" strokeWidth="1.5" strokeLinecap="round" />
            <path ref={pathRef} d={ROUTE} stroke="rgb(94 234 212)" strokeWidth="2" strokeLinecap="round" />
            {STOPS.map((stop) => (
              <circle key={stop.at} data-stop cx={stop.x} cy={stop.y} r="5" fill="#07100f" stroke="rgb(94 234 212)" strokeWidth="2" />
            ))}
            <circle ref={dotRef} cx="10" cy="112" r="7" fill="#efeadf" stroke="rgb(12 94 88)" strokeWidth="3" />
          </svg>
        </div>

        <div className="flex items-end justify-between">
          <p ref={counterRef} className="font-mono text-5xl tabular-nums sm:text-7xl">000</p>
          <p className="max-w-[10rem] text-right font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em] text-l-bone/50">
            Where&apos;s the shuttle?
          </p>
        </div>
      </div>
    </div>
  );
}
