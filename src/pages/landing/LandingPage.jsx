import { useCallback, useEffect, useState } from 'react';
import { Cursor } from './Cursor';
import { Footer } from './Footer';
import { LandingNav } from './LandingNav';
import { Hero } from './Hero';
import { WhatSection } from './WhatSection';
import { ScrollStory } from './ScrollStory';
import { JoinSection } from './JoinSection';
import { DRIVER_INTEREST_ENDPOINT } from './config';
import { submitDriverInterest } from './driverInterest';
import { MotionProvider } from './motion/MotionProvider';
import { browserCanAnimate } from './motion/context';
import { Loader } from './motion/Loader';
import { markIntroSeen, readIntroSeen, shouldPlayIntro } from './motion/intro';
import './landing.css';

const sessionStore = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null; // blocked by the browser: treat the opening as unseen
  }
};

/** 'playing' if the opening should run for this visit, else 'done'. */
function initialIntro() {
  if (typeof window === 'undefined') return 'done';
  const canAnimate = browserCanAnimate();
  const reduced = canAnimate && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return shouldPlayIntro({ canAnimate, reduced, seen: readIntroSeen(sessionStore()) }) ? 'playing' : 'done';
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
  const [intro, setIntro] = useState(initialIntro);
  const finishIntro = useCallback(() => {
    markIntroSeen(sessionStore());
    setIntro('done');
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Pingo · Live shuttle tracking for Sri Lanka';
    return () => { document.title = previous; };
  }, []);

  return (
    <MotionProvider>
    <div className="landing dark min-h-screen" data-intro={intro}>
      {intro === 'playing' ? <Loader onDone={finishIntro} /> : null}
      <a
        href="#what"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-teal-300 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#04211d]"
      >
        Skip to content
      </a>
      <LandingNav />
      <Cursor />
      <main>
        <Hero />
        <WhatSection />
        <ScrollStory />
        <JoinSection onDriverSubmit={onDriverSubmit} />
      </main>
      <Footer />
    </div>
    </MotionProvider>
  );
}
