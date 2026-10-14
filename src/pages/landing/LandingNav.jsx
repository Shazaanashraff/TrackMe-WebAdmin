import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoMark } from './LogoMark';
import { NAV_LINKS } from './config';

// A section counts as "current" once its top has passed this far down the screen.
const SPY_OFFSET = 160;

// The sections the four ticks stand for, top to bottom.
const SECTIONS = ['top', 'what', 'how-it-works', 'join'];

// The full-screen menu a phone gets.
const MENU = [...NAV_LINKS, { label: 'Get the app', href: '#join' }];

const MENU_ORIGIN = 'calc(100% - 2.3rem) 2.6rem'; // where the menu button is: the menu opens out of it

/**
 * A floating pill, centred at the top. Inside: the mark and name with a pulsing live dot, the section
 * link, four ticks that stretch and light up as you pass each section, and one button, "Get the app".
 * A glint runs round its edge, a thin line along the bottom fills as the page scrolls, and it slides
 * away on the way down and comes back on the way up so it never sits over the content. On a phone a
 * round menu button opens a full-screen menu out of its corner. Nothing else: the manager's sign in
 * lives in the footer.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [current, setCurrent] = useState('');
  const [section, setSection] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const progressRef = useRef(null);
  const openRef = useRef(false);
  openRef.current = open;

  useEffect(() => {
    let frame = 0;
    let last = window.scrollY;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 24);

      // The last section whose top has scrolled past the line wins.
      let active = '';
      NAV_LINKS.forEach(({ href }) => {
        const el = document.getElementById(href.slice(1));
        if (el && el.getBoundingClientRect().top <= SPY_OFFSET) active = href;
      });
      setCurrent(active);
      let tick = 0;
      SECTIONS.forEach((id, index) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= SPY_OFFSET) tick = index;
      });
      setSection(tick);

      // Away on the way down, back on the way up; always there near the top or with the menu open.
      if (openRef.current || y < 120) setHidden(false);
      else if (y > last + 6) setHidden(true);
      else if (y < last - 6) setHidden(false);
      last = y;

      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${room > 0 ? Math.min(1, y / room) : 0})`;
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
  }, []);

  // Escape closes the menu, and so does growing past the width where it exists.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const bar = 'absolute h-px w-4 bg-l-bone transition-transform duration-500';

  return (
    <>
      <header
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 transition-transform duration-500 ease-out sm:pt-5',
          hidden && '-translate-y-[150%]',
        )}
      >
        <div
          data-nav-pill
          data-scrolled={scrolled}
          className={cn(
            'l-nav-glint pointer-events-auto relative flex w-full max-w-[38rem] items-center justify-between gap-1.5 rounded-full py-1.5 pl-2 pr-1.5 shadow-[0_16px_50px_-14px_rgb(0_0_0/0.7)] backdrop-blur-2xl transition-colors duration-500 sm:gap-2',
            scrolled || open ? 'bg-l-ink/85' : 'bg-l-ink/55',
          )}
        >
          <a href="#top" className="flex min-w-0 items-center gap-2.5 rounded-full pr-2" aria-label="Pingo home">
            <span className="relative shrink-0">
              <LogoMark className="h-9 w-9 rounded-full bg-l-bone text-base text-l-ink" />
              {/* A live dot: the whole product is "where is it right now". */}
              <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inset-0 rounded-full bg-l-teal" style={{ animation: 'l-ping 2.4s ease-out infinite' }} />
                <span className="relative h-2.5 w-2.5 rounded-full border border-l-ink bg-l-teal" />
              </span>
            </span>
            {/* On the narrowest phones the mark alone stands for the name; the link keeps its label. */}
            <span className="font-display truncate text-lg font-semibold tracking-tight text-l-bone max-[359px]:sr-only">Pingo</span>
          </a>

          <nav aria-label="Landing" className="hidden items-center gap-3 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={current === link.href ? 'location' : undefined}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium',
                  current === link.href ? 'bg-l-bone/10 text-l-bone' : 'text-l-bone/70',
                )}
              >
                {link.label}
              </a>
            ))}
            {/* Four ticks, one per section: the one you are in stretches and glows. */}
            <span aria-hidden="true" className="flex items-center gap-1">
              {SECTIONS.map((id, index) => (
                <span
                  key={id}
                  data-tick={index === section ? 'on' : 'off'}
                  className={cn(
                    'h-1 rounded-full transition-all duration-500',
                    index === section ? 'w-5 bg-l-teal' : 'w-1.5 bg-l-bone/25',
                  )}
                />
              ))}
            </span>
          </nav>

          <div className="flex items-center gap-1.5">
            <a
              href="#join"
              className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-l-bone px-4 text-sm font-semibold text-l-ink sm:px-5 coarse:h-11"
            >
              Get the app
              <ArrowDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
            </a>
            <button
              type="button"
              aria-expanded={open}
              aria-controls="landing-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((value) => !value)}
              className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-l-bone/25 md:hidden coarse:h-11 coarse:w-11"
            >
              <span className={bar} style={{ transform: open ? 'rotate(45deg)' : 'translateY(-3px)' }} />
              <span className={bar} style={{ transform: open ? 'rotate(-45deg)' : 'translateY(3px)' }} />
            </button>
          </div>

          {/* How far down the page you are. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 -bottom-px h-px overflow-hidden">
            <span ref={progressRef} data-nav-progress className="block h-full origin-left scale-x-0 bg-l-teal" />
          </span>
        </div>
      </header>

      {/* The phone menu: opens as a circle growing out of the menu button. Closed, it is not in the tab
          order or the accessibility tree. */}
      <div
        id="landing-menu"
        data-open={open}
        aria-hidden={!open}
        data-lenis-prevent
        className={cn(
          'l-menu fixed inset-0 z-40 touch-none overscroll-contain bg-l-ink md:hidden',
          open ? 'visible' : 'invisible',
        )}
        style={{
          clipPath: open ? `circle(150vmax at ${MENU_ORIGIN})` : `circle(0px at ${MENU_ORIGIN})`,
          transition: `clip-path 0.8s cubic-bezier(0.7, 0, 0.2, 1), visibility 0s linear ${open ? '0s' : '0.8s'}`,
        }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_85%_0%,rgb(29_86_176/0.45),transparent)]" />
        <nav aria-label="Menu" className="relative flex h-full flex-col justify-center gap-2 px-7 pb-10 pt-24">
          {MENU.map((link, index) => (
            <a
              key={link.href}
              href={link.href}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className="group flex items-baseline gap-4 border-b border-l-bone/15 py-5"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? 'none' : 'translateY(40px)',
                transition: `opacity 0.7s ease ${open ? 0.3 + index * 0.1 : 0}s, transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) ${open ? 0.3 + index * 0.1 : 0}s`,
              }}
            >
              <span className="font-mono text-xs text-l-teal">{String(index + 1).padStart(2, '0')}</span>
              <span className="font-display text-[clamp(2.6rem,12vw,4rem)] font-semibold leading-none text-l-bone">{link.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
