import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Car, UserRound } from 'lucide-react';
import { HeroFilm } from './HeroFilm';
import { NightRoad } from './NightRoad';
import { HERO_VIDEO } from './config';
import { CURTAIN_VARS, RECEDE, clearCurtain, curtainScreens, curtainUnits, declareCurtain } from './curtain';
import { coverGeometry, pickClip, sceneShift } from './heroVideo';
import { HERO_SCREENS, heroScreens, heroWindow } from './roadScene';
import { useMotion } from './motion/context';
import { EASE, ScrollTrigger, gsap } from './motion/gsapSetup';
import { useGsapContext } from './motion/useGsapContext';
import { useViewportSize } from './motion/useViewportSize';

// How far the visitor scrolls, in screens, while the hero is pinned and playing out (on a wide
// screen; a phone gets a shorter film, see heroScreens in roadScene.js).
export const HERO_SCROLL_SCREENS = HERO_SCREENS.wide;
export const HERO_SCRUB = 0.6; // the half-second-ish lag that makes scroll-linked motion feel liquid
export const HERO_START_SCALE = 0.72;
// A film clip is not zoomed out at the start (it would show its own edges as the window opens, and
// there is no whole shuttle to fit in); it pushes in a little instead.
export const HERO_VIDEO_PUSH = 1.06;

function Word({ children, delay }) {
  return (
    <span className="l-word">
      <span style={{ '--d': `${delay}ms` }}>{children}</span>
    </span>
  );
}

// A word that sits behind a mask until the scroll sequence lifts it into view.
function MaskWord({ children }) {
  return (
    <span className="l-mask">
      <span data-aw className="inline-block">{children}</span>
    </span>
  );
}

const TICKER = ['Schools', 'Campuses', 'Offices'];

// Giant outlined words drifting along the bottom edge. Pure texture, so hidden
// from assistive tech.
function Ticker() {
  return (
    <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-20 overflow-hidden pb-14 sm:pb-20">
      <div className="l-marquee-track flex">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {TICKER.map((word) => (
              <span
                key={word}
                className="l-outline font-display flex items-center gap-8 pr-8 text-[clamp(3.5rem,9vw,8rem)] font-semibold uppercase leading-none sm:gap-14 sm:pr-14"
              >
                {word}
                <span className="h-3 w-3 shrink-0 rounded-full bg-l-teal" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// The thin frame the opening sits inside: a hairline border with an L at each corner.
function Frame() {
  const corner = 'absolute h-4 w-4 border-l-bone/60';
  return (
    <div data-frame aria-hidden="true" className="pointer-events-none absolute inset-x-4 bottom-4 top-[4.75rem] z-[5] hidden border border-l-bone/10 sm:inset-x-5 sm:bottom-5 sm:block">
      <span className={`${corner} -left-px -top-px border-l border-t`} />
      <span className={`${corner} -right-px -top-px border-r border-t`} />
      <span className={`${corner} -bottom-px -left-px border-b border-l`} />
      <span className={`${corner} -bottom-px -right-px border-b border-r`} />
    </div>
  );
}

/**
 * The hero is a short film played by scrolling. The stage is pinned for about two screens:
 *
 *   dark frame, the question "Where's the shuttle?" on the left, and a small circular window
 *   around the shuttle on the right  ->  the window grows until it fills the screen  ->  the
 *   question lifts away and the answer, "Right here.", rises in  ->  the pin releases and the
 *   next section slides over.
 *
 * Anything a visitor might need (the countdown, both buttons) is on screen from the first
 * moment, so nobody has to scroll to act. For visitors who prefer reduced motion the film is
 * skipped and the page shows its finished frame.
 */
export function Hero({ video = HERO_VIDEO }) {
  const { reduced } = useMotion();
  const animated = !reduced;
  const { width, height } = useViewportSize();
  const headlineRef = useRef(null);
  // Where the headline really starts. On a phone the window lives in the gap above it, so it must
  // be measured (the headline's height changes with the screen, the font, the wrapping). Only a
  // film clip uses it: the coded road's window has to stay on its own shuttle.
  const [headlineTop, setHeadlineTop] = useState(0);
  const spec = useMemo(
    () => heroWindow(width, height, video ? headlineTop : 0),
    [width, height, headlineTop, video],
  );
  // The clip that suits this screen: the wide one, or a portrait cut for an upright phone.
  const clip = pickClip(video, width, height);
  // The camera: the coded road starts zoomed out and pushes in to fill; a film clip starts at its
  // natural size and pushes in a little. With a clip the scene also starts slid, so the clip's
  // subject is under the window.
  const lens = video ? { from: 1, to: HERO_VIDEO_PUSH } : { from: HERO_START_SCALE, to: 1 };
  const shift = useMemo(
    () => sceneShift(width, height, spec, clip, lens.from),
    [width, height, spec, clip, lens.from],
  );
  const box = useMemo(
    () => (clip ? coverGeometry(width, height, clip.width, clip.height) : null),
    [width, height, clip],
  );

  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  // The film plays for `filmScreens` of scrolling; then the stage stays pinned for `curtain` more
  // while the next section slides up over it (see curtain.js).
  const filmScreens = heroScreens(width);
  const curtain = curtainScreens(width);

  useLayoutEffect(() => {
    if (!video) return undefined;
    const measure = () => {
      const h1 = headlineRef.current;
      const stage = stageRef.current;
      if (!h1 || !stage) return;
      const top = Math.round(h1.getBoundingClientRect().top - stage.getBoundingClientRect().top);
      setHeadlineTop((previous) => (Math.abs(previous - top) > 1 ? top : previous));
    };
    measure();
    let cancelled = false;
    document.fonts?.ready?.then(() => { if (!cancelled) measure(); });
    return () => { cancelled = true; };
  }, [video, width, height]);
  const speedRef = useRef(1); // how fast the road rushes past; rises when you scroll fast

  useGsapContext(
    () => {
      if (!animated) return;

      const tl = gsap.timeline({
        defaults: { ease: EASE.linear },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: () => {
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            // The next section rises by exactly the curtain's length, so tell it how far.
            declareCurtain(sectionRef.current, CURTAIN_VARS.hero, Math.round(vh * curtainScreens(vw)));
            return `+=${Math.round(vh * (heroScreens(vw) + curtainScreens(vw)))}`;
          },
          pin: stageRef.current,
          scrub: HERO_SCRUB,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // The hero is rebuilt when the phone measures its headline, which makes it the newest trigger;
          // pins must still be measured top to bottom or the story below starts too early.
          refreshPriority: 2,
        },
      });

      tl.fromTo(stageRef.current, { '--wr': `${spec.r0}px` }, { '--wr': `${spec.rFull}px`, ease: 'power2.inOut', duration: 0.55 }, 0)
        // The camera pushes in as the window opens (and, with a clip, glides the scene back from
        // where it was slid to put the subject under the window).
        .fromTo('[data-scene]', { scale: lens.from, x: shift.x, y: shift.y }, { scale: lens.to, x: 0, y: 0, ease: 'power1.out', duration: 0.6 }, 0)
        .to('[data-frame]', { opacity: 0, duration: 0.25 }, 0.05)
        .to('[data-cue]', { opacity: 0, duration: 0.08 }, 0)
        // The question lifts away...
        .to('[data-q]', { yPercent: -60, opacity: 0, ease: 'power2.in', duration: 0.2 }, 0.25)
        // ...and the answer rises in from behind its masks.
        .set('[data-a]', { opacity: 1 }, 0.42)
        .fromTo('[data-aw]', { yPercent: 115 }, { yPercent: 0, ease: EASE.out, duration: 0.22, stagger: 0.05 }, 0.42)
        .to('[data-eyebrow]', { opacity: 1, duration: 0.15 }, 0.58)
        // Hold the finished frame for a beat...
        .to({}, { duration: 0.2 }, 0.8)
        // ...then, as the next section slides up over the pinned stage, it recedes: a little
        // smaller, its corners rounding, and dimming.
        .to(
          '[data-curtain]',
          { scale: RECEDE.scale, yPercent: RECEDE.yPercent, borderRadius: RECEDE.radius, transformOrigin: '50% 30%', ease: 'none', duration: curtainUnits(1, filmScreens, curtain) },
          1,
        )
        .fromTo('[data-shade]', { opacity: 0 }, { opacity: RECEDE.shade, ease: 'none', duration: curtainUnits(1, filmScreens, curtain) }, 1);
    },
    [animated, spec.x, spec.y, spec.r0, spec.rFull, shift.x, shift.y, lens.from, lens.to, filmScreens, curtain],
    sectionRef,
  );

  // When the film stops being pinned (reduced motion switched on), the next section stops rising.
  useEffect(() => {
    const section = sectionRef.current;
    return () => clearCurtain(section, CURTAIN_VARS.hero);
  }, [animated]);

  // Fonts arriving late move the headline; pinned distances must be measured again.
  useEffect(() => {
    if (!animated) return undefined;
    let cancelled = false;
    document.fonts?.ready?.then(() => { if (!cancelled) ScrollTrigger.refresh(); });
    return () => { cancelled = true; };
  }, [animated]);

  // The road rushes faster the faster you scroll, then eases back to cruising speed. (Only the coded
  // road reacts; a film clip plays at its own pace.)
  useEffect(() => {
    if (!animated || video) return undefined;
    let last = window.scrollY;
    const tick = () => {
      const y = window.scrollY;
      const velocity = Math.abs(y - last);
      last = y;
      const target = 1 + Math.min(velocity / 14, 6);
      speedRef.current += (target - speedRef.current) * 0.1;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [animated, video]);

  return (
    <section id="top" ref={sectionRef} className="relative bg-l-ink">
      <div
        ref={stageRef}
        data-hero-state={animated ? 'scrubbed' : 'static'}
        className="l-grain relative isolate h-[100svh] min-h-[36rem] overflow-hidden bg-l-ink"
        style={{
          '--wx': `${spec.x}px`,
          '--wy': `${spec.y}px`,
          '--wr': `${animated ? spec.r0 : spec.rFull}px`,
        }}
      >
        {/* Everything on the stage lives in one wrapper, so the whole scene can recede as one when the
            next section slides over it. */}
        <div data-curtain className="absolute inset-0 isolate overflow-hidden bg-l-ink">
          <Frame />

          {/* The window: everything that is the scene lives inside it, so it all opens together. */}
          <div data-window className="l-hero-window absolute inset-0 z-[1]">
            <div data-scene className="absolute inset-0" style={{ transformOrigin: 'var(--wx) var(--wy)' }}>
              {/* Real footage when there is some, otherwise the night road, drawn live in code. */}
              {video ? (
                <HeroFilm clip={clip} animated={animated} watch={stageRef} box={box} />
              ) : (
                <NightRoad className="absolute inset-0 h-full w-full" speedRef={speedRef} />
              )}
            </div>

            {/* A touch of the page's own ink over the daylight, so a film clip sits in the palette. It is
                here, not in the scene, because the scene slides and this must always cover the window. */}
            {video ? <div aria-hidden="true" className="absolute inset-0 bg-l-ink/15" /> : null}

            {/* Keep the type readable once the window is open: dark on the left, and at the edges. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_right,rgb(8_22_31/0.78),rgb(8_22_31/0.3)_48%,transparent_80%)] max-lg:hidden"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(8_22_31/0.7),transparent_26%,transparent_42%,rgb(8_22_31))]"
            />
          </div>

          {/* A ring that rides the window's edge. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-[2] rounded-full border border-l-teal/40"
            style={{
              left: 'calc(var(--wx) - var(--wr))',
              top: 'calc(var(--wy) - var(--wr))',
              width: 'calc(var(--wr) * 2)',
              height: 'calc(var(--wr) * 2)',
            }}
          />

          <div className="relative z-20 mx-auto flex h-full w-full max-w-[90rem] flex-col justify-end px-4 pb-40 pt-28 sm:px-8 sm:pb-60 [@media(max-height:700px)]:pb-32">
            {/* The question, kept small, once the answer has taken over the headline. */}
            <p
              data-eyebrow
              aria-hidden="true"
              className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-l-teal [text-shadow:0_1px_10px_rgb(8_22_31/0.95)]"
              style={{ opacity: animated ? 0 : 1 }}
            >
              Where&apos;s the shuttle?
            </p>

            <h1 ref={headlineRef} className="relative font-display text-[clamp(3rem,12.5vw,11.5rem)] font-semibold leading-[0.86] text-l-bone">
              {/* Both halves are always in the page, so a screen reader hears the whole exchange. */}
              <span data-q className={animated ? 'block' : 'sr-only'}>
                <span className="block">
                  <Word delay={200}>Where&apos;s</Word>
                  {' '}
                  <Word delay={290}>the</Word>
                </span>
                {' '}
                <span className="block">
                  <Word delay={380}>shuttle?</Word>
                </span>
              </span>
              {' '}
              <span data-a className={animated ? 'absolute inset-0 block' : 'block'} style={{ opacity: animated ? 0 : 1 }}>
                <span className="block"><MaskWord>Right</MaskWord></span>
                {' '}
                <span className="block"><MaskWord>here.</MaskWord></span>
              </span>
            </h1>

            <div className="l-fade-in mt-8 flex flex-wrap items-center gap-3" style={{ '--d': '1100ms' }}>
              <a
                href="#join"
                className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-l-bone px-6 text-sm font-semibold text-l-ink"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                I&apos;m a rider
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
              <a
                href="#join"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-l-bone/40 px-6 text-sm font-semibold text-l-bone"
              >
                <Car className="h-4 w-4" aria-hidden="true" />
                I&apos;m a driver
              </a>
            </div>
          </div>

          <div
            data-cue
            aria-hidden="true"
            className="absolute bottom-40 right-6 z-20 hidden flex-col items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-l-bone/50 sm:flex md:right-9"
          >
            <span className="relative h-12 w-px overflow-hidden bg-l-bone/20">
              <span
                className="absolute inset-x-0 top-0 h-1/2 bg-l-teal"
                style={{ animation: 'l-scroll-cue 2s var(--l-ease) infinite' }}
              />
            </span>
          </div>

          <Ticker />
        </div>
        <div data-shade aria-hidden="true" className="pointer-events-none absolute inset-0 z-[60] bg-l-ink opacity-0" />
      </div>
    </section>
  );
}
