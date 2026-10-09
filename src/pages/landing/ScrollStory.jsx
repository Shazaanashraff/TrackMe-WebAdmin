import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { LaptopFrame, PhoneFrame } from './DeviceFrames';
import { Reveal } from './Reveal';
import { STORY } from './config';
import { sectionProgress, sideForStep, stepFromProgress } from './story';
import MapScreen from './screens/MapScreen';
import EnrollScreen from './screens/EnrollScreen';
import ProfilesScreen from './screens/ProfilesScreen';
import PortalScreen from './screens/PortalScreen';

const PHONE_SCREENS = [MapScreen, EnrollScreen, ProfilesScreen];
const DESKTOP_QUERY = '(min-width: 1024px)';

/** Which story step the viewport is on, from the section's scroll position. */
function useStoryStep(ref, count, enabled) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const progress = sectionProgress(rect.top, rect.height, window.innerHeight);
      setStep(stepFromProgress(progress, count));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, count, enabled]);

  return step;
}

function StepCopy({ item, index }) {
  return (
    <>
      <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-l-teal">
        <span className="font-mono text-l-bone/40">{String(index + 1).padStart(2, '0')}</span>
        {item.audience}
      </p>
      <h3 className="font-display mt-4 text-[clamp(2.6rem,5vw,5rem)] font-semibold leading-[0.98] text-l-bone">
        {item.title}
      </h3>
      <p className="mt-5 max-w-sm text-lg leading-snug text-l-bone/65">{item.body}</p>
    </>
  );
}

function PhoneStage({ step }) {
  return (
    <PhoneFrame>
      {PHONE_SCREENS.map((Screen, i) => (
        <div
          key={STORY[i].key}
          aria-hidden={i !== step}
          className={cn(
            'absolute inset-0 transition-all duration-700',
            i === step ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-0',
          )}
        >
          <Screen />
        </div>
      ))}
    </PhoneFrame>
  );
}

function DesktopStory({ step }) {
  const side = sideForStep(step);
  const isLaptop = STORY[step].device === 'laptop';

  return (
    <div className="relative mx-auto h-full w-full max-w-7xl">
      {/* The device layer: one half-width column that slides left <-> right. */}
      <div
        className="l-device-move absolute inset-y-0 left-0 grid w-1/2 place-items-center"
        style={{ transform: side === 'right' ? 'translateX(100%)' : 'translateX(0)' }}
      >
        <div aria-hidden="true" className="absolute aspect-square h-[78%] rounded-full border border-white/10" />
        <div
          aria-hidden="true"
          className="l-spin absolute aspect-square h-[94%] rounded-full border border-dashed border-white/15"
        />
        <div
          className={cn(
            'col-start-1 row-start-1 transition-all duration-700',
            isLaptop ? 'pointer-events-none scale-90 opacity-0' : 'scale-100 opacity-100',
          )}
        >
          <div className="l-float"><PhoneStage step={step} /></div>
        </div>
        <div
          className={cn(
            'col-start-1 row-start-1 transition-all duration-700',
            isLaptop ? 'scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0',
          )}
        >
          <LaptopFrame><PortalScreen active={isLaptop} /></LaptopFrame>
        </div>
      </div>

      {/* One text block per step, parked on whichever side the device is not. */}
      {STORY.map((item, i) => {
        const textOnRight = sideForStep(i) === 'left';
        const current = i === step;
        return (
          <div
            key={item.key}
            aria-hidden={!current}
            className={cn(
              'l-step-text absolute inset-y-0 flex w-1/2 flex-col justify-center px-10 xl:px-16',
              textOnRight ? 'left-1/2' : 'left-0',
              current ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0',
            )}
          >
            <StepCopy item={item} index={i} />
          </div>
        );
      })}

      <ol
        aria-label="Progress"
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-2"
      >
        {STORY.map((item, i) => (
          <li
            key={item.key}
            className={cn(
              'h-1 rounded-full transition-all duration-500',
              i === step ? 'w-10 bg-teal-300' : 'w-4 bg-white/20',
            )}
          />
        ))}
      </ol>
    </div>
  );
}

const PORTAL_AREAS = ['Vehicles', 'Drivers', 'Enrollments', 'Live tracking'];

// Below `lg` there is no room to slide a device between sides, so the phones
// tilt in alternate directions instead, echoing the swap. The laptop is shown
// whole; its screen is texture at this size, so the pills below say what it does.
function StackedStory() {
  return (
    <div className="mx-auto max-w-2xl space-y-20 px-4 pb-4 sm:px-8 sm:pb-16">
      {STORY.map((item, i) => {
        const Screen = PHONE_SCREENS[i];
        const isLaptop = item.device === 'laptop';
        return (
          <Reveal key={item.key} className="space-y-8">
            <div>
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
                  <Screen />
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
  const ref = useRef(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const step = useStoryStep(ref, STORY.length, isDesktop);
  const side = sideForStep(step);

  return (
    <section
      id="how-it-works"
      ref={ref}
      data-step={isDesktop ? step : undefined}
      data-side={isDesktop ? side : undefined}
      aria-labelledby="how-heading"
      className="relative bg-l-ink"
      style={isDesktop ? { height: `${STORY.length * 100}vh` } : undefined}
    >
      {isDesktop ? (
        <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
          <div className="mx-auto w-full max-w-7xl px-8 pt-24">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-l-bone/40">How it works</p>
            <h2 id="how-heading" className="sr-only">How TrackMe works</h2>
          </div>
          <div className="min-h-0 flex-1">
            <DesktopStory step={step} />
          </div>
        </div>
      ) : (
        <>
          <div className="mx-auto max-w-2xl px-4 pb-10 pt-20 sm:px-8 sm:pb-14 sm:pt-24">
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
