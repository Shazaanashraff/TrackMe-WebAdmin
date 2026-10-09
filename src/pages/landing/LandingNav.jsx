import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoMark } from './LogoMark';
import { NAV_LINKS } from './config';

// A section counts as "current" once its top has passed this far down the screen.
const SPY_OFFSET = 160;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [current, setCurrent] = useState('');

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
      // The last section whose top has scrolled past the line wins.
      let active = '';
      NAV_LINKS.forEach(({ href }) => {
        const el = document.getElementById(href.slice(1));
        if (el && el.getBoundingClientRect().top <= SPY_OFFSET) active = href;
      });
      setCurrent(active);
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

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled
          ? 'border-b border-l-bone/10 bg-l-ink/95 backdrop-blur-md'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between px-4 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5" aria-label="TrackMe home">
          <LogoMark />
          <span className="font-display text-base font-semibold tracking-tight text-l-bone">TrackMe</span>
        </a>

        <nav aria-label="Landing" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={current === link.href ? 'location' : undefined}
              className={cn(
                'relative py-1 text-sm transition-colors hover:text-l-bone',
                current === link.href ? 'text-l-bone' : 'text-l-bone/55',
              )}
            >
              {link.label}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-0 -bottom-0.5 h-px origin-left bg-l-teal transition-transform duration-500',
                  current === link.href ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </a>
          ))}
        </nav>

        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded-full border border-l-bone/25 px-4 py-2 text-sm font-medium text-l-bone transition-colors hover:border-l-bone hover:bg-l-bone/10 coarse:min-h-11"
        >
          Manager sign in
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
