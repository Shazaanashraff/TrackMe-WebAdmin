import { Fragment, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { LaptopFrame, PhoneFrame } from './DeviceFrames';
import { Reveal } from './Reveal';
import { TabEdge } from './TabEdge';
import { STORY } from './config';
import { SIDE_X, SIDE_X_COMPACT, chapterCounter } from './chapterMath';
import { sideForStep } from './story';
import { buildStoryFilm } from './storyFilm';
import { useMotion } from './motion/context';
import { useGsapContext } from './motion/useGsapContext';
import { useViewportSize } from './motion/useViewportSize';
import { CURTAIN_VARS, clearCurtain } from './curtain';
import MapScreen from './screens/MapScreen';
import EnrollScreen from './screens/EnrollScreen';
import ProfilesScreen from './screens/ProfilesScreen';
import PortalScreen from './screens/PortalScreen';

const PHONE_SCREENS = [MapScreen, EnrollScreen, ProfilesScreen];
const DESKTOP_QUERY = '(min-width: 1024px)';

// Each word of a title sits behind its own mask, so the film can lift it into view.
function MaskedWords({ text }) {
  return text.split(' ').map((word, i) => (
    <Fragment key={`${word}-${i}`}>
      {i > 0 && ' '}
      <span className="l-mask"><span data-tw className="inline-block">{word}</span></span>
    </Fragment>
  ));
}

function StepCopy({ item, index, masked = false, compact = false }) {
  return (
    <>
      <p data-eyebrow-c className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-l-teal">
        <span className="font-mono text-l-bone/40">{String(index + 1).padStart(2, '0')}</span>
        {item.audience}
      </p>
      <h3
        className={cn(
          'font-display mt-4 font-semibold leading-[0.98] text-l-bone',
          compact ? 'text-[clamp(2.1rem,9vw,3.4rem)]' : 'text-[clamp(2.6rem,5vw,5rem)]',
        )}
      >
        {masked ? <MaskedWords text={item.title} /> : item.title}
      </h3>
    </>
  );
}

// Every screen is always in the phone, stacked; the film fades between them. On a short window
// the phone shrinks so its whole height fits between the stage's heading and its progress bar.
// A phone's screens are drawn for a phone about this wide. On a short or narrow screen the whole
// phone is scaled down as a picture, never squeezed narrower (which would re-wrap its text).
const COMPACT_PHONE_WIDTH = 246;
const COMPACT_PHONE_HEIGHT = Math.round((COMPACT_PHONE_WIDTH * 18.5) / 9);
const COMPACT_CHROME = 19 * 16; // the heading above the device and the copy and progress below it

function CompactPhone() {
  const { width, height } = useViewportSize();
  const scale = Math.min(1, Math.max(180, height - COMPACT_CHROME) / COMPACT_PHONE_HEIGHT, (width - 48) / COMPACT_PHONE_WIDTH);
  return (
    <div style={{ width: COMPACT_PHONE_WIDTH * scale, height: COMPACT_PHONE_HEIGHT * scale }}>
      <div style={{ width: COMPACT_PHONE_WIDTH, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        <PhoneStage fixedWidth />
      </div>
    </div>
  );
}

function PhoneStage({ fixedWidth = false }) {
  return (
    <PhoneFrame
      className={fixedWidth ? 'w-full' : 'w-[min(300px,76vw,calc((100svh_-_10rem)*0.4865))]'}
    >
      {PHONE_SCREENS.map((Screen, i) => (
        <div
          key={STORY[i].key}
          data-screen={i}
          className={cn('absolute inset-0', i > 0 && 'opacity-0')}
        >
          <Screen />
        </div>
      ))}
    </PhoneFrame>
  );
}

/**
 * The pinned stage. React renders where everything starts (chapter one: phone on the left, its
 * copy on the right, every other chapter waiting); the film in storyFilm.js moves it all.
 *
 * `compact` is the same stage for a phone or tablet: the device sits above its copy, centred, and
 * sways instead of changing sides.
 */
function PinnedStory({ step, compact = false }) {
  return (
    <div className="relative mx-auto h-full w-full max-w-7xl">
      {/* The device layer. Wide: one half-width column that glides left <-> right. Compact: the
          whole width above the copy; it sways a little. */}
      <div
        data-device
        className={cn(
          'absolute grid place-items-center will-change-transform',
          compact ? 'inset-x-0 top-0 bottom-[11.5rem]' : 'inset-y-0 left-0 w-1/2 pb-16',
        )}
      >
        {/* Rings and glow, centred on the device (the column keeps room below for the progress bar). */}
        <div
          aria-hidden="true"
          className={cn('pointer-events-none absolute inset-x-0 top-0 grid place-items-center', compact ? 'bottom-0' : 'bottom-16')}
        >
          <div className="col-start-1 row-start-1 aspect-square h-[120%] rounded-full bg-[radial-gradient(closest-side,rgb(29_86_176/0.4),transparent)]" />
          <div className="col-start-1 row-start-1 aspect-square h-[78%] rounded-full border border-white/10" />
          <div className="l-spin col-start-1 row-start-1 aspect-square h-[94%] rounded-full border border-dashed border-white/15" />
        </div>
        <div data-phone className="col-start-1 row-start-1">
          <div className="l-float">{compact ? <CompactPhone /> : <PhoneStage />}</div>
        </div>
        <div data-laptop className="col-start-1 row-start-1 opacity-0">
          <LaptopFrame className={compact ? 'w-[min(640px,88vw)]' : 'w-[min(640px,46vw)]'}>
            <PortalScreen scrubbed />
          </LaptopFrame>
        </div>
      </div>

      {/* One block of copy per chapter, parked on whichever side the device is not. */}
      {STORY.map((item, i) => (
        <div
          key={item.key}
          data-copy
          aria-hidden={i !== step}
          className={cn(
            'absolute flex flex-col',
            compact
              ? 'inset-x-0 bottom-14 h-[9rem] justify-end px-6 sm:px-10'
              : cn(
                'inset-y-0 w-1/2 justify-center px-10 pb-16 xl:px-16',
                sideForStep(i) === 'left' ? 'left-1/2' : 'left-0',
              ),
            i > 0 && 'opacity-0',
          )}
        >
          {/* A giant outlined number behind the copy: texture, not content. */}
          {compact ? null : (
            <span
              aria-hidden="true"
              className="l-outline font-display pointer-events-none absolute left-9 top-[6%] select-none text-[clamp(6rem,min(17vw,22svh),15rem)] font-semibold leading-none xl:left-[3.75rem]"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
          )}
          <div className="relative">
            <StepCopy item={item} index={i} masked compact={compact} />
          </div>
        </div>
      ))}

      {/* One bar per chapter, each filling while its chapter plays. */}
      <div className={cn('absolute flex items-center gap-6', compact ? 'inset-x-6 bottom-6 sm:inset-x-10' : 'inset-x-10 bottom-8 xl:inset-x-16')}>
        <p aria-hidden="true" className="shrink-0 whitespace-nowrap font-mono text-xs tracking-[0.2em] text-l-bone/50">
          {chapterCounter(step)}
        </p>
        <ol aria-label="Progress" className="flex flex-1 items-center gap-2">
          {STORY.map((item, i) => (
            <li
              key={item.key}
              aria-current={i === step ? 'step' : undefined}
              className="h-px flex-1 overflow-hidden bg-white/15"
            >
              <span data-seg className="block h-full origin-left scale-x-0 bg-l-teal" />
              <span className="sr-only">{item.title}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const PORTAL_AREAS = ['Vehicles', 'Drivers', 'Enrollments', 'Live tracking'];

// The plain chapters, for visitors who asked for less motion: a title above a device, in a column.
// On a narrow screen the phones tilt in alternate directions, echoing the swap the film does; the
// laptop is shown whole, and its screen is texture at this size, so the pills below say what it
// does. A wide screen gets the same chapters as alternating rows. Each chapter just fades up.
function StackedStory() {
  return (
    <div className="mx-auto max-w-2xl space-y-20 px-4 pb-4 sm:px-8 sm:pb-16 lg:max-w-6xl lg:space-y-28 lg:px-10">
      {STORY.map((item, i) => {
        const Screen = PHONE_SCREENS[i];
        const isLaptop = item.device === 'laptop';
        return (
          <Reveal
            key={item.key}
            className="space-y-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:space-y-0"
          >
            <div className={cn('lg:px-6', i % 2 === 0 && 'lg:order-2')}>
              <StepCopy item={item} index={i} />
            </div>
            <div className="relative grid grid-cols-[minmax(0,1fr)] place-items-center py-4">
              <div aria-hidden="true" className="absolute aspect-square h-[92%] rounded-full border border-white/10" />
              {isLaptop ? (
                <div className="w-full">
                  <div className="flex justify-center py-2">
                    <LaptopFrame>
                      <PortalScreen />
                    </LaptopFrame>
                  </div>
                  <ul className="mt-6 flex flex-wrap justify-center gap-2">
                    {PORTAL_AREAS.map((area) => (
                      <li
                        key={area}
                        className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/70"
                      >
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <PhoneFrame className={cn('sm:rotate-0', i % 2 === 0 ? '-rotate-3' : 'rotate-3')}>
                  <div className="absolute inset-0">
                    <Screen />
                  </div>
                </PhoneFrame>
              )}
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

export function ScrollStory() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const { reduced } = useMotion();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  // The story is pinned and played by scrolling everywhere except for visitors who asked for less
  // motion, who get the plain chapters. A phone gets the compact stage (device above its copy).
  const pinned = !reduced;
  const compact = !isDesktop;
  const [step, setStep] = useState(0);

  useGsapContext(
    () => {
      if (reduced) return;
      buildStoryFilm(sectionRef.current, stageRef.current, { onStep: setStep, sideX: compact ? SIDE_X_COMPACT : SIDE_X });
    },
    [pinned, reduced, compact],
    sectionRef,
  );

  // When the story stops being pinned (the window narrows, reduced motion), the next section stops rising.
  useEffect(() => {
    const section = sectionRef.current;
    return () => { if (!pinned) return; clearCurtain(section, CURTAIN_VARS.story); };
  }, [pinned]);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      data-step={pinned ? step : undefined}
      data-side={pinned ? sideForStep(step) : undefined}
      aria-labelledby="how-heading"
      className="relative bg-l-ink"
    >
      {/* The paper section above hangs a tab down over this one. */}
      <TabEdge tone="bone" />
      {pinned ? (
        <div ref={stageRef} data-story-stage className="relative h-screen overflow-hidden bg-l-ink">
          {/* The whole scene is one wrapper, so it can recede as one when the next section slides over it. */}
          <div data-curtain className="flex h-full flex-col overflow-hidden bg-l-ink">
            <div className="mx-auto w-full max-w-7xl px-6 pt-[4.5rem] sm:px-8 lg:pt-24">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-l-bone/40">How it works</p>
              <h2 id="how-heading" className="sr-only">How Pingo works</h2>
            </div>
            <div className="min-h-0 flex-1">
              <PinnedStory step={step} compact={compact} />
            </div>
          </div>
          <div data-shade aria-hidden="true" className="pointer-events-none absolute inset-0 z-[60] bg-l-ink opacity-0" />
        </div>
      ) : (
        <>
          <div className="mx-auto max-w-2xl px-4 pb-10 pt-20 sm:px-8 sm:pb-14 sm:pt-24 lg:max-w-6xl lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-l-bone/40">How it works</p>
            <h2
              id="how-heading"
              className="font-display mt-3 text-5xl font-semibold leading-[0.95] text-l-bone sm:text-6xl"
            >
              Roadside to control room.
            </h2>
          </div>
          <StackedStory />
        </>
      )}
    </section>
  );
}
