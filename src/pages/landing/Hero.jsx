import { useRef } from 'react';
import { ArrowRight, Car, UserRound } from 'lucide-react';
import { RouteCanvas } from './RouteCanvas';
import { HERO_VIDEO } from './config';

function Word({ children, delay, className }) {
  return (
    <span className="l-word">
      <span className={className} style={{ '--d': `${delay}ms` }}>{children}</span>
    </span>
  );
}

const MARQUEE_ITEMS = [
  'Schools', 'Universities', 'Offices', 'Public routes', 'Custom routes', 'Live tracking', 'Approved riders',
];

function EtaCard({ className }) {
  return (
    <div className={`l-glass rounded-2xl p-4 ${className || ''}`}>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/50">
        <span>Morning Shuttle A</span>
        <span className="flex items-center gap-1 text-teal-300">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> Live
        </span>
      </div>
      <p className="font-display mt-3 text-4xl font-semibold text-white">4 min</p>
      <p className="mt-0.5 text-xs text-white/55">to your stop · 2 stops away</p>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-teal-300 to-sky-300" />
      </div>
    </div>
  );
}

function Marquee() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 overflow-hidden border-y border-white/10 bg-black/30 py-3.5 backdrop-blur"
    >
      <div className="l-marquee-track flex">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {MARQUEE_ITEMS.map((item) => (
              <span
                key={item}
                className="flex items-center gap-8 pr-8 text-xs font-medium uppercase tracking-[0.22em] text-white/45"
              >
                {item}
                <span className="h-1 w-1 rounded-full bg-teal-300/70" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  const ref = useRef(null);

  // The glow follows the pointer by writing two CSS variables, not React state,
  // so moving the mouse never re-renders the page.
  const onPointerMove = (event) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    node.style.setProperty('--my', `${event.clientY - rect.top}px`);
  };

  return (
    <section
      id="top"
      ref={ref}
      onPointerMove={onPointerMove}
      className="l-grain relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* Layer 0: the clip when there is one, else the living route map. */}
      {HERO_VIDEO ? (
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
      ) : null}
      <RouteCanvas className="absolute inset-0 -z-20 h-full w-full opacity-80" />

      {/* Colour grade: pulls any footage into the petrol palette, and sinks the
          edges so the headline always has contrast. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-teal-900/25 mix-blend-color" />
      <div aria-hidden="true" className="l-spotlight absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_30%_40%,transparent_0%,#04090b_78%),linear-gradient(to_bottom,#04090b99,transparent_30%,transparent_60%,#04090b)]"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-32 pt-28 sm:px-8">
        <p
          className="l-fade-in mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium tracking-wide text-teal-200 backdrop-blur"
          style={{ '--d': '100ms' }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-teal-300 opacity-60"
              style={{ animation: 'l-ping 2s ease-out infinite' }}
            />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-300" />
          </span>
          Live shuttle tracking for Sri Lanka
        </p>

        <h1 className="font-display text-[clamp(3.3rem,10vw,8.5rem)] font-semibold leading-[0.95] text-white">
          <span className="block">
            <Word delay={250}>Every</Word>
            {' '}
            <Word delay={330}>shuttle.</Word>
          </span>
          <span className="block">
            <Word delay={450}>Every</Word>
            {' '}
            <Word delay={530}>stop.</Word>
            {' '}
            <Word delay={650} className="l-gradient-text">Live.</Word>
          </span>
        </h1>

        <p
          className="l-fade-in mt-8 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg"
          style={{ '--d': '900ms' }}
        >
          TrackMe gives riders, drivers and fleet managers one live view of school,
          university and office transport, so nobody waits at the roadside wondering.
        </p>

        <div className="l-fade-in mt-10 flex flex-wrap items-center gap-3" style={{ '--d': '1100ms' }}>
          <a
            href="#join"
            className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-teal-300 px-6 text-sm font-semibold text-[#04211d] shadow-[0_0_40px_-6px_rgb(45_212_191/0.7)] transition-all hover:bg-teal-200 hover:shadow-[0_0_56px_-4px_rgb(45_212_191/0.9)]"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            I&apos;m a rider
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </a>
          <a
            href="#join"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur transition-colors hover:border-white/50 hover:bg-white/10"
          >
            <Car className="h-4 w-4" aria-hidden="true" />
            I&apos;m a driver
          </a>
        </div>

        {/* On a phone the card sits in the flow, under the buttons. */}
        <div
          className="l-fade-in mt-10 w-full max-w-[17rem] lg:hidden"
          style={{ '--d': '1400ms' }}
          aria-hidden="true"
        >
          <EtaCard />
        </div>
      </div>

      {/* The same card, floating over the hero on large screens. */}
      <div
        className="l-fade-in absolute bottom-28 right-6 z-10 hidden w-64 lg:block xl:right-16"
        style={{ '--d': '1500ms' }}
        aria-hidden="true"
      >
        <EtaCard className="l-float" />
      </div>

      <Marquee />
    </section>
  );
}
