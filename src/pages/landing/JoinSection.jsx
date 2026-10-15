import { Fragment, useRef } from 'react';
import { Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Cross } from './GridMarks';
import { PhoneFrame } from './DeviceFrames';
import { Reveal } from './Reveal';
import { LeadForm } from './LeadForm';
import { TabEdge } from './TabEdge';
import { useAppDownloadLinks } from './useAppDownloadLinks';
import { CURTAIN_VARS, risesOver } from './curtain';
import { useMotion } from './motion/context';
import { EASE, gsap } from './motion/gsapSetup';
import { useGsapContext } from './motion/useGsapContext';
import MapScreen from './screens/MapScreen';

// One store badge: the platform's mark, a small line above the name. With no link yet it is a plain,
// disabled badge that says "Coming soon" rather than a button that goes nowhere (a fallback only:
// both apps normally have a direct download).
function StoreButton({ href, label, sub, Icon }) {
  const body = (
    <>
      <Icon className="h-7 w-7 shrink-0" aria-hidden="true" />
      <span className="text-left leading-tight">
        <span className="block whitespace-nowrap text-[11px] uppercase tracking-wider opacity-70">
          {href ? sub : 'Coming soon'}
        </span>
        <span className="font-display block whitespace-nowrap text-xl font-semibold tracking-tight">{label}</span>
      </span>
    </>
  );
  const base = 'inline-flex min-h-16 min-w-[11.5rem] items-center gap-3.5 rounded-2xl px-5';

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cn(base, 'bg-l-ink text-l-bone')}>
        {body}
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled
      className={cn(base, 'cursor-not-allowed border border-l-ink/25 bg-l-ink/[0.05] text-l-ink/60')}
    >
      {body}
    </button>
  );
}

// Words that sit behind a mask until the page lifts them into view (a phone's scroll does that).
function MaskedWords({ text }) {
  return text.split(' ').map((word, index) => (
    <Fragment key={`${word}-${index}`}>
      {index > 0 && ' '}
      <span className="l-mask"><span data-hw className="inline-block">{word}</span></span>
    </Fragment>
  ));
}

// The big, plainly readable numeral that tells the two answers apart.
function Numeral({ children }) {
  return (
    <span
      aria-hidden="true"
      className="font-display block text-[clamp(4rem,8vw,7rem)] font-semibold leading-[0.8] text-l-sky"
    >
      {children}
    </span>
  );
}

/**
 * The choice: rider or driver. One drawn spread on paper: a big question and a measured grid
 * (hairlines, crosshairs where they meet) holding the two answers, each led by a clear numeral.
 * The rider's half is the download area: both store badges and a phone rising from the bottom edge.
 * The driver's half is the email form. As few words as the choice allows.
 *
 * On a phone it also plays as it arrives: the question's words rise from behind masks, the two
 * halves come up one after the other, and under the rider's buttons a phone climbs inside a sky-blue
 * arch as you scroll.
 *
 * It slides up over the pinned story like a curtain, with the tab on its top edge flattening as
 * it arrives (see curtain.js).
 */
export function JoinSection({ onDriverSubmit }) {
  const { riderAndroid, driverAndroid } = useAppDownloadLinks();
  const sectionRef = useRef(null);
  const { reduced } = useMotion();
  const mobile = useMediaQuery('(max-width: 767px)');

  useGsapContext(
    () => {
      if (reduced || !mobile) return;
      const section = sectionRef.current;
      const toggleActions = 'play none none reverse';
      gsap.from(section.querySelectorAll('[data-hw]'), {
        yPercent: 115,
        duration: 1.1,
        ease: EASE.out,
        stagger: 0.09,
        scrollTrigger: { trigger: section.querySelector('#join-heading'), start: 'top 90%', toggleActions },
      });
      section.querySelectorAll('[data-panel]').forEach((panel) => {
        gsap.from(panel, {
          y: 70,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: panel, start: 'top 88%', toggleActions },
        });
      });
      const scrub = { trigger: section.querySelector('[data-arch]'), start: 'top 100%', end: 'bottom 55%', scrub: 0.7 };
      gsap.fromTo('[data-arch]', { scaleY: 0.3 }, { scaleY: 1, transformOrigin: '50% 100%', ease: 'none', scrollTrigger: scrub });
      gsap.fromTo('[data-phone-rise]', { y: 214 }, { y: 90, ease: 'none', scrollTrigger: scrub });
    },
    [reduced, mobile],
    sectionRef,
  );

  return (
    <section
      id="join"
      ref={sectionRef}
      aria-labelledby="join-heading"
      className="relative z-10 bg-l-bone text-l-ink"
      style={risesOver(CURTAIN_VARS.story)}
    >
      <TabEdge tone="ink" />
      <div className="mx-auto max-w-[90rem] px-4 pb-20 pt-28 sm:px-8 sm:pb-32 sm:pt-44">
        <Reveal>
          <h2
            id="join-heading"
            className="font-display text-[clamp(3rem,10vw,9.5rem)] font-semibold leading-[0.9]"
          >
            <MaskedWords text="Rider or driver?" />
          </h2>
        </Reveal>

        <div className="relative mt-14 sm:mt-20">
          <Cross style={{ left: 0, top: 0 }} />
          <Cross style={{ left: '100%', top: 0 }} />
          <Cross style={{ left: 0, top: '100%' }} />
          <Cross style={{ left: '100%', top: '100%' }} />
          <Cross className="hidden lg:block" style={{ left: '50%', top: 0 }} />
          <Cross className="hidden lg:block" style={{ left: '50%', top: '100%' }} />

          <div className="l-split border-y border-l-ink/15">
            <div data-panel className="relative flex min-h-[24rem] flex-col overflow-hidden p-6 sm:p-10 lg:min-h-[34rem] lg:p-14">
              <Numeral>01</Numeral>
              <h3 className="font-display relative mt-8 text-[clamp(2.6rem,5vw,4.6rem)] font-semibold leading-none">
                I&apos;m a rider
              </h3>
              <div className="relative mt-auto flex flex-col gap-3 pt-12 sm:flex-row sm:items-start lg:flex-col">
                <StoreButton href={riderAndroid} sub="Android · direct download" label="Rider app" Icon={Smartphone} />
              </div>

              {/* On a phone: the same phone, rising inside a sky-blue arch under the buttons. Decorative. */}
              <div
                aria-hidden="true"
                className="pointer-events-none relative -mb-6 mt-10 h-[15rem] w-[300px] self-center overflow-hidden sm:-mb-10 md:hidden"
              >
                <div data-arch className="absolute inset-x-0 bottom-0 h-[13rem] rounded-t-full bg-l-sky" />
                <div data-phone-rise className="relative mx-auto w-[200px] translate-y-[90px]">
                  <div className="rotate-[6deg]">
                    <PhoneFrame className="w-full">
                      <div className="absolute inset-0">
                        <MapScreen />
                      </div>
                    </PhoneFrame>
                  </div>
                </div>
              </div>

              {/* A phone rising out of the bottom edge: the live map, at rest. Decorative. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-44 right-8 hidden rotate-[6deg] md:block lg:right-10 xl:right-16"
              >
                <PhoneFrame className="w-[200px] xl:w-[230px]">
                  <div className="absolute inset-0">
                    <MapScreen />
                  </div>
                </PhoneFrame>
              </div>
            </div>

            <div data-panel className="relative flex min-h-[24rem] flex-col overflow-hidden border-t border-l-ink/15 p-6 sm:p-10 lg:min-h-[34rem] lg:border-l lg:border-t-0 lg:p-14">
              <Numeral>02</Numeral>
              <h3 className="font-display relative mt-8 text-[clamp(2.6rem,5vw,4.6rem)] font-semibold leading-none">
                I&apos;m a driver
              </h3>
              <div className="relative mt-auto flex flex-col gap-6 pt-12">
                <StoreButton href={driverAndroid} sub="Android · direct download" label="Driver app" Icon={Smartphone} />
                <LeadForm onSubmit={onDriverSubmit} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
