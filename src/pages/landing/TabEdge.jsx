import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useMotion } from './motion/context';
import { gsap } from './motion/gsapSetup';
import { useGsapContext } from './motion/useGsapContext';

// The colour of the section above, which is the colour the tab is drawn in.
const TONES = {
  ink: 'text-l-ink',
  bone: 'text-l-bone',
  sky: 'text-l-sky',
};

// A shoulder: a flat top edge that curves down into the tab's full depth, in an S. The two are
// mirror images, so the tab has soft corners at both ends instead of a hard step.
const LEFT = 'M0 0H64V24C38 24 26 0 0 0Z';
const RIGHT = 'M0 0H64C38 0 26 24 0 24Z';

/**
 * The seam between two sections: the section above does not end in a straight line. Its edge is
 * flat out towards both sides and, in the middle, it hangs a little way down over the section
 * below, on soft S-shaped shoulders, like the tab on a folder. As the section below arrives the
 * tab flattens out until the seam is a straight line (`flattenBy` says where on the screen that
 * is: 'top 12%' is nearly at the top).
 *
 * Put it first inside the section BELOW, which must be `relative`. It is drawn in the colour of the
 * section above (`tone`) and sits over the top of this one, so it needs no help from the section
 * above and never moves with a pinned scene. With reduced motion it simply stays as it is.
 */
export function TabEdge({ tone = 'ink', className, flattenBy = 'top 12%' }) {
  const { reduced } = useMotion();
  const ref = useRef(null);
  const shapeRef = useRef(null);

  useGsapContext(
    () => {
      const section = ref.current?.parentElement;
      if (reduced || !section || !shapeRef.current) return;
      gsap.fromTo(
        shapeRef.current,
        { scaleY: 1 },
        {
          scaleY: 0,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: flattenBy, scrub: 0.4 },
        },
      );
    },
    [reduced, flattenBy],
    ref,
  );

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-tab={tone}
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-20 h-5 sm:h-8',
        TONES[tone] ?? TONES.ink,
        className,
      )}
    >
      <div ref={shapeRef} data-tab-shape className="mx-[5%] flex h-full origin-top sm:mx-[14%]">
        <svg viewBox="0 0 64 24" preserveAspectRatio="none" className="h-full w-12 shrink-0 fill-current sm:w-20">
          <path d={LEFT} />
        </svg>
        {/* A pixel of overlap each side, so no hairline shows where the pieces meet. */}
        <div className="-mx-px h-full flex-1 bg-current" />
        <svg viewBox="0 0 64 24" preserveAspectRatio="none" className="h-full w-12 shrink-0 fill-current sm:w-20">
          <path d={RIGHT} />
        </svg>
      </div>
    </div>
  );
}
