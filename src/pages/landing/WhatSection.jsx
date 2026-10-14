import { useRef } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Cross } from './GridMarks';
import { FleetArt, KeyArt, LiveMapArt } from './PointArt';
import { Reveal } from './Reveal';
import { ScrubText } from './ScrubText';
import { TabEdge } from './TabEdge';
import { CURTAIN_VARS, risesOver } from './curtain';
import { POINTS, STATEMENT } from './config';
import { useMotion } from './motion/context';
import { gsap } from './motion/gsapSetup';
import { useGsapContext } from './motion/useGsapContext';

// Which drawing goes with which point (the points themselves live in config.js).
const POINT_ART = { live: LiveMapArt, riders: KeyArt, fleet: FleetArt };

/**
 * The light, paper-coloured break between the dark hero and the dark story.
 * One big sentence that lights up as you read it, then the three points drawn as a measured
 * grid: hairline cells, crosshairs where the lines meet, and a small drawing in each. On a phone
 * each drawing plays as its cell scrolls through (the road draws itself, the key lights up letter by
 * letter, the fleet's bars fill) and the title slides in, so the stack never sits still.
 *
 * It rises over the pinned hero like a curtain (see curtain.js): the hero stays put and this
 * slides up over it, with the tab on its top edge flattening as it arrives.
 */
export function WhatSection() {
  const sectionRef = useRef(null);
  const { reduced } = useMotion();
  const mobile = useMediaQuery('(max-width: 1023px)');

  useGsapContext(
    () => {
      if (reduced || !mobile) return;
      gsap.utils.toArray('[data-point]', sectionRef.current).forEach((cell) => {
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: cell, start: 'top 85%', end: 'top 30%', scrub: 0.6 },
        });
        tl.fromTo(cell.querySelector('h3'), { x: -28, opacity: 0.15 }, { x: 0, opacity: 1, duration: 0.5 }, 0.2);
        const draw = cell.querySelector('[data-draw]');
        if (draw) {
          tl.fromTo(draw, { attr: { 'stroke-dasharray': 1, 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1 }, 0)
            .fromTo(cell.querySelectorAll('[data-stop]'), { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.25 }, 0);
        }
        const keys = cell.querySelectorAll('[data-key]');
        if (keys.length) {
          tl.fromTo(keys, { opacity: 0.08, y: 8 }, { opacity: 1, y: 0, duration: 0.2, stagger: 0.14 }, 0)
            .fromTo(cell.querySelector('[data-approved]'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
        }
        const bars = cell.querySelectorAll('[data-bar]');
        if (bars.length) {
          tl.fromTo(bars, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.5, stagger: 0.2 }, 0);
        }
      });
    },
    [reduced, mobile],
    sectionRef,
  );

  return (
    <section
      id="what"
      ref={sectionRef}
      aria-labelledby="what-heading"
      className="relative z-10 min-h-screen bg-l-bone px-4 pb-24 pt-28 text-l-ink sm:px-8 sm:pb-36 sm:pt-44"
      style={risesOver(CURTAIN_VARS.hero)}
    >
      <TabEdge tone="ink" />
      <div className="mx-auto max-w-[90rem]">
        <ScrubText
          as="h2"
          id="what-heading"
          text={STATEMENT}
          className="font-display max-w-6xl text-[clamp(2.2rem,6.4vw,6.4rem)] font-semibold leading-[1.02]"
        />

        <div className="relative mt-20 sm:mt-32">
          {/* Crosshairs where the grid's lines meet: its four corners, and (side by side) the two joints. */}
          <Cross style={{ left: 0, top: 0 }} />
          <Cross style={{ left: '100%', top: 0 }} />
          <Cross style={{ left: 0, top: '100%' }} />
          <Cross style={{ left: '100%', top: '100%' }} />
          <Cross className="hidden sm:block" style={{ left: '33.3333%', top: 0 }} />
          <Cross className="hidden sm:block" style={{ left: '66.6667%', top: 0 }} />
          <Cross className="hidden sm:block" style={{ left: '33.3333%', top: '100%' }} />
          <Cross className="hidden sm:block" style={{ left: '66.6667%', top: '100%' }} />

          <ul className="grid divide-y divide-l-ink/15 border-y border-l-ink/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {POINTS.map((point, index) => {
              const Art = POINT_ART[point.key];
              return (
                <Reveal
                  as="li"
                  key={point.key}
                  data-point
                  delay={index * 110}
                  className="relative flex min-h-[19rem] flex-col p-6 sm:min-h-[26rem] sm:p-8 lg:p-10"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-l-sky">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="mt-8 flex flex-1 items-center text-l-sky">
                    {Art ? <Art className="h-28 w-full max-w-[20rem]" /> : null}
                  </div>

                  <h3 className="font-display mt-10 text-3xl font-semibold sm:text-4xl">{point.title}</h3>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
