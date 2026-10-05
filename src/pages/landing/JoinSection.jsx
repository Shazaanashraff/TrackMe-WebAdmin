import { Car, Download, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';
import { LeadForm } from './LeadForm';
import { useAppDownloadLinks } from './useAppDownloadLinks';

function StoreButton({ href, label, sub }) {
  const body = (
    <>
      <Download className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-left leading-tight">
        <span className="block whitespace-nowrap text-[10px] uppercase tracking-wider opacity-60">
          {href ? sub : 'Coming soon'}
        </span>
        <span className="block whitespace-nowrap text-sm font-semibold">{label}</span>
      </span>
    </>
  );
  const base = 'inline-flex min-h-14 items-center gap-3 rounded-2xl border px-5 transition-colors';

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cn(base, 'border-white/20 bg-white text-[#04211d] hover:bg-teal-100')}
      >
        {body}
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled
      className={cn(base, 'cursor-not-allowed border-white/10 bg-white/5 text-white/50')}
    >
      {body}
    </button>
  );
}

export function JoinSection({ onDriverSubmit }) {
  const { riderAndroid, riderIos, driverAndroid } = useAppDownloadLinks();

  return (
    <section id="join" aria-labelledby="join-heading" className="relative px-4 py-20 sm:px-8 sm:py-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[480px] bg-[radial-gradient(ellipse_at_50%_100%,rgb(45_212_191/0.14),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-7xl">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">Get started</p>
        </Reveal>
        <Reveal delay={80}>
          <h2
            id="join-heading"
            className="font-display mt-5 max-w-3xl text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[1.02] text-white"
          >
            Are you a rider,
            <br />
            or a <span className="l-gradient-text">driver?</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-5 lg:grid-cols-2">
          <Reveal className="l-card flex flex-col rounded-[2rem] p-8 sm:p-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-300 text-[#04211d]">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="font-display mt-8 text-3xl font-semibold text-white">I&apos;m a rider</h3>
            <p className="mt-3 max-w-md leading-relaxed text-white/60">
              Download the TrackMe app, enter your driver&apos;s key, and watch your shuttle on the map.
            </p>
            <div className="mt-auto flex flex-col gap-3 pt-10 sm:flex-row">
              <StoreButton href={riderIos} sub="Get it on" label="iPhone (iOS)" />
              <StoreButton href={riderAndroid} sub="Direct download" label="Android (APK)" />
            </div>
          </Reveal>

          <Reveal delay={120} className="l-card flex flex-col rounded-[2rem] p-8 sm:p-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-300/40 bg-teal-300/10 text-teal-200">
              <Car className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="font-display mt-8 text-3xl font-semibold text-white">I&apos;m a driver</h3>
            <p className="mt-3 max-w-md leading-relaxed text-white/60">
              Leave your email and we&apos;ll send you the driver app and what happens next.
            </p>
            <div className="mt-auto pt-10">
              <LeadForm onSubmit={onDriverSubmit} />
              {driverAndroid && (
                <p className="mt-4 text-xs text-white/50">
                  Already approved by a manager?{' '}
                  <a href={driverAndroid} className="font-medium text-teal-300 underline-offset-2 hover:underline">
                    Download the driver app directly
                  </a>
                </p>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
