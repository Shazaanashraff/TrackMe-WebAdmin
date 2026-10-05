import { KeyRound, LayoutDashboard, MapPin, Route as RouteIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';
import { MiniRoute } from './MiniRoute';
import { PILLARS } from './config';

const ICONS = {
  live: MapPin,
  enroll: KeyRound,
  fleet: LayoutDashboard,
  routes: RouteIcon,
};

export function WhatSection() {
  return (
    <section id="what" aria-labelledby="what-heading" className="relative px-4 py-20 sm:px-8 sm:py-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[880px] -translate-x-1/2 rounded-full bg-teal-500/10 blur-[140px]"
      />

      <div className="relative mx-auto max-w-7xl">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">What is TrackMe</p>
        </Reveal>
        <Reveal delay={80}>
          <h2
            id="what-heading"
            className="font-display mt-5 max-w-4xl text-[clamp(2.2rem,5.4vw,4.6rem)] font-semibold leading-[1.04] text-white"
          >
            One live view for every school, university and office{' '}
            <span className="l-gradient-text">shuttle.</span>
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/60">
            TrackMe is a tracking platform for shuttles. Riders see where their vehicle is,
            drivers share their position as they go, and fleet managers run the whole
            operation from one portal.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, i) => {
            const Icon = ICONS[pillar.key];
            return (
              <Reveal
                key={pillar.key}
                delay={i * 90}
                className={cn('l-card group rounded-3xl p-7 sm:p-8', pillar.span)}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-300/25 bg-teal-300/10 text-teal-200 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="font-display mt-10 text-2xl font-semibold text-white">{pillar.title}</h3>
                <p className="mt-3 max-w-sm leading-relaxed text-white/55">{pillar.body}</p>
                {pillar.key === 'live' || pillar.key === 'routes' ? (
                  <MiniRoute className="pointer-events-none absolute right-5 top-6 h-16 w-24 opacity-80 sm:hidden" />
                ) : null}
                {pillar.key === 'live' ? (
                  <MiniRoute className="pointer-events-none absolute bottom-6 right-6 hidden h-36 w-48 opacity-90 sm:block" />
                ) : null}
                {pillar.key === 'routes' ? (
                  <MiniRoute wide className="pointer-events-none absolute inset-y-0 right-8 hidden h-full w-[48%] opacity-80 lg:block" />
                ) : null}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
