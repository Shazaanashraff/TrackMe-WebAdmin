import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { TabEdge } from './TabEdge';
import { PRIVACY_URL } from './config';
import { useMotion } from './motion/context';
import { gsap } from './motion/gsapSetup';
import { useGsapContext } from './motion/useGsapContext';

/**
 * The finale. The page ends where the route does: as the footer scrolls in, a circle of sky opens
 * from the bottom edge until it fills the footer, and the giant wordmark fills in left to right
 * as the last of the page goes by. The wordmark is texture (aria-hidden); the links are the
 * footer. For reduced motion the footer is simply finished: sky, with the wordmark filled.
 */
export function Footer() {
  const { reduced } = useMotion();
  const ref = useRef(null);

  useGsapContext(
    () => {
      if (reduced) return;
      const trigger = { trigger: ref.current, scrub: 0.6 };
      // Both are done exactly when the very bottom of the page arrives, at any screen size.
      gsap.fromTo('[data-wipe]', { '--r': '0%' }, { '--r': '150%', ease: 'none', scrollTrigger: { ...trigger, start: 'top 95%', end: 'bottom bottom' } });
      gsap.fromTo(
        '[data-fill]',
        // The negative top and bottom let the tail of the "g" through: it hangs below the line box.
        { clipPath: 'inset(-20% 100% -30% 0%)' },
        { clipPath: 'inset(-20% 0% -30% 0%)', ease: 'none', scrollTrigger: { ...trigger, start: 'top 75%', end: 'bottom bottom' } },
      );
    },
    [reduced],
    ref,
  );

  const wordmark = 'font-display col-start-1 row-start-1 select-none text-center text-[clamp(5rem,30vw,34rem)] font-semibold leading-[1.14]';

  return (
    <footer ref={ref} className="relative overflow-hidden bg-l-ink px-4 pt-24 text-l-bone sm:px-8 sm:pt-28">
      <TabEdge tone="bone" flattenBy="top 45%" />
      {/* The circle of sky that opens from the bottom edge. */}
      <div data-wipe aria-hidden="true" className="l-wipe absolute inset-0 bg-l-sky" style={{ '--y': '100%' }} />

      <div className="relative mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-x-10 gap-y-4 border-t border-l-bone/20 pt-8 text-sm text-l-bone/90">
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
            Privacy policy
          </a>
          <Link to="/login">
            Manager sign in
          </Link>
        </nav>
        <p>© {new Date().getFullYear()} Pingo</p>
      </div>

      {/* The wordmark, drawn huge: outlined, then filled in as the page ends. */}
      <div aria-hidden="true" className="relative mx-auto mt-6 grid max-w-[90rem] pb-6 sm:pb-12">
        <p className={`${wordmark} l-outline`}>Pingo</p>
        <p data-fill className={`${wordmark} text-l-bone`}>Pingo</p>
      </div>
    </footer>
  );
}
