import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from './LogoMark';
import { LandingNav } from './LandingNav';
import { RouteRail } from './RouteRail';
import { Hero } from './Hero';
import { WhatSection } from './WhatSection';
import { ScrollStory } from './ScrollStory';
import { JoinSection } from './JoinSection';
import { DRIVER_INTEREST_ENDPOINT, PRIVACY_URL } from './config';
import { submitDriverInterest } from './driverInterest';
import './landing.css';

function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-12 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-display text-base font-semibold text-white">TrackMe</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/55">
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
            Privacy policy
          </a>
          <Link to="/login" className="transition-colors hover:text-white">
            Manager sign in
          </Link>
        </nav>
        <p className="text-xs text-white/35">© {new Date().getFullYear()} TrackMe</p>
      </div>
    </footer>
  );
}

/**
 * The public front door at `/`. Signed-out visitors only: App.jsx redirects a
 * signed-in manager or super-admin to their dashboard before this ever renders.
 *
 * Always dark. The wrapper carries `dark` so the Atlas dark tokens apply to
 * this subtree whatever theme the portal last used.
 */
export default function LandingPage({
  // No endpoint configured -> undefined -> the form says nothing was sent.
  onDriverSubmit = DRIVER_INTEREST_ENDPOINT ? submitDriverInterest : undefined,
}) {
  useEffect(() => {
    const previous = document.title;
    document.title = 'TrackMe · Live shuttle tracking for Sri Lanka';
    return () => { document.title = previous; };
  }, []);

  return (
    <div className="landing dark min-h-screen">
      <a
        href="#what"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-teal-300 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#04211d]"
      >
        Skip to content
      </a>
      <LandingNav />
      <RouteRail />
      <main>
        <Hero />
        <WhatSection />
        <ScrollStory />
        <JoinSection onDriverSubmit={onDriverSubmit} />
      </main>
      <Footer />
    </div>
  );
}
