import { ArrowRight, Car, UserRound } from 'lucide-react';
import { LiveEta } from './LiveEta';
import { NightRoad } from './NightRoad';
import { HERO_VIDEO } from './config';

function Word({ children, delay }) {
  return (
    <span className="l-word">
      <span style={{ '--d': `${delay}ms` }}>{children}</span>
    </span>
  );
}

const TICKER = ['Schools', 'Campuses', 'Offices'];

// Giant outlined words drifting along the bottom edge. Pure texture, so hidden
// from assistive tech.
function Ticker() {
  return (
    <div aria-hidden="true" className="absolute inset-x-0 bottom-0 overflow-hidden pb-14 sm:pb-20">
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

export function Hero() {
  return (
    <section
      id="top"
      className="l-grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-l-ink"
    >
      {/* Layer 0: real footage when there is some, otherwise the night road,
          drawn live in code. */}
      {HERO_VIDEO ? (
        <>
          <video
            className="absolute inset-0 -z-30 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={HERO_VIDEO.poster}
            aria-hidden="true"
          >
            {HERO_VIDEO.webm && <source src={HERO_VIDEO.webm} type="video/webm" />}
            {HERO_VIDEO.mp4 && <source src={HERO_VIDEO.mp4} type="video/mp4" />}
          </video>
          {/* Pull the footage into the palette. */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-teal-950/40 mix-blend-color" />
        </>
      ) : (
        <NightRoad className="absolute inset-0 -z-20 h-full w-full" />
      )}

      {/* Keep the type readable: dark on the left where it sits, and at the top and bottom edges. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(7_16_15/0.78),rgb(7_16_15/0.3)_48%,transparent_80%)] max-lg:hidden"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgb(7_16_15/0.7),transparent_26%,transparent_42%,rgb(7_16_15/0.92))]"
      />

      <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col justify-end px-4 pb-48 pt-28 sm:px-8 sm:pb-60">
        <h1 className="font-display text-[clamp(3.6rem,12.5vw,11.5rem)] font-semibold leading-[0.86] text-l-bone">
          <span className="block">
            <Word delay={200}>Where&apos;s</Word>
            {' '}
            <Word delay={290}>the</Word>
          </span>
          {' '}
          <span className="block">
            <Word delay={380}>shuttle?</Word>
          </span>
        </h1>

        <div className="l-fade-in mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ '--d': '900ms' }}>
          <LiveEta />
          <p className="max-w-xs text-sm leading-snug text-l-bone/70 sm:text-base">
            Live tracking for school, campus and office rides.
          </p>
        </div>

        <div className="l-fade-in mt-8 flex flex-wrap items-center gap-3" style={{ '--d': '1100ms' }}>
          <a
            href="#join"
            className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-l-bone px-6 text-sm font-semibold text-l-ink transition-colors hover:bg-white"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            I&apos;m a rider
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </a>
          <a
            href="#join"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-l-bone/40 px-6 text-sm font-semibold text-l-bone transition-colors hover:border-l-bone hover:bg-l-bone/10"
          >
            <Car className="h-4 w-4" aria-hidden="true" />
            I&apos;m a driver
          </a>
        </div>
      </div>

      <Ticker />
    </section>
  );
}
