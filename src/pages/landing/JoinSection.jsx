import { Download } from 'lucide-react';
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
  const base = 'inline-flex min-h-14 items-center gap-3 rounded-full border px-6 transition-colors';

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cn(
          base,
          'border-transparent bg-l-bone text-l-ink hover:bg-white',
        )}
      >
        {body}
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled
      className={cn(base, 'cursor-not-allowed border-l-bone/25 bg-black/15 text-l-bone/70')}
    >
      {body}
    </button>
  );
}

/**
 * Two full-width panels, no cards: petrol for riders, ink for drivers. On a
 * wide screen the panel under the pointer widens a little. Few words, because
 * the choice itself is the content.
 */
export function JoinSection({ onDriverSubmit }) {
  const { riderAndroid, riderIos, driverAndroid } = useAppDownloadLinks();

  return (
    <section id="join" aria-labelledby="join-heading" className="relative bg-l-ink">
      <div className="mx-auto max-w-[90rem] px-4 pb-14 pt-24 sm:px-8 sm:pb-20 sm:pt-36">
        <Reveal>
          <h2
            id="join-heading"
            className="font-display text-[clamp(3rem,10vw,9.5rem)] font-semibold leading-[0.9] text-l-bone"
          >
            Rider or driver?
          </h2>
        </Reveal>
      </div>

      <div className="l-split">
        <div className="l-panel-a flex min-h-[26rem] flex-col bg-l-petrol p-8 text-l-bone sm:p-14 lg:min-h-[34rem]">
          <p className="font-mono text-sm text-l-bone/60">01</p>
          <h3 className="font-display mt-6 text-[clamp(2.6rem,5vw,4.6rem)] font-semibold leading-none">
            I&apos;m a rider
          </h3>
          <p className="mt-4 max-w-xs text-lg text-l-bone/75">
            Get the app. Enter your driver&apos;s key.
          </p>
          <div className="mt-auto flex flex-col gap-3 pt-12 sm:flex-row">
            <StoreButton href={riderIos} sub="Get it on" label="iPhone (iOS)" />
            <StoreButton href={riderAndroid} sub="Direct download" label="Android (APK)" />
          </div>
        </div>

        <div className="l-panel-b flex min-h-[26rem] flex-col border-t border-l-bone/10 bg-l-ink p-8 text-l-bone sm:p-14 lg:min-h-[34rem] lg:border-l lg:border-t-0">
          <p className="font-mono text-sm text-l-bone/50">02</p>
          <h3 className="font-display mt-6 text-[clamp(2.6rem,5vw,4.6rem)] font-semibold leading-none">
            I&apos;m a driver
          </h3>
          <p className="mt-4 max-w-xs text-lg text-l-bone/70">
            Leave your email. We&apos;ll send the app.
          </p>
          <div className="mt-auto pt-12">
            <LeadForm onSubmit={onDriverSubmit} />
            {driverAndroid && (
              <p className="mt-4 text-sm text-l-bone/55">
                Already approved?{' '}
                <a href={driverAndroid} className="font-medium text-l-teal underline-offset-2 hover:underline">
                  Download the driver app
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
