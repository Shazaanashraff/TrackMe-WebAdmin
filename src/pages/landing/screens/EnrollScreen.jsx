import { KEY, STATUS, STEPS, statusDotClass } from './enroll';

// Illustrative "join a driver" screen. Generic sample content, not real data.
// It rests on its finished state (key typed, request sent, waiting for approval); how scrolling
// plays it from the start lives in enroll.js.

export default function EnrollScreen() {
  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#0c1c28] to-[#08161f] px-4 pb-4 pt-12 text-white">
      <p className="text-[9px] uppercase tracking-[0.18em] text-teal-300/80">Join a driver</p>
      <h3 className="font-display mt-1 text-[17px] font-semibold leading-tight">Enter your driver&apos;s key</h3>
      <p className="mt-1.5 text-[10px] leading-relaxed text-white/50">
        Your driver shares a short key. It links you to their shuttle.
      </p>

      <div className="mt-5 grid grid-cols-6 gap-1.5">
        {KEY.map((c, i) => (
          <div
            key={i}
            data-key-box
            data-on="true"
            className="flex aspect-square items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] font-mono text-sm font-medium transition-colors data-[on=true]:border-teal-300/50"
          >
            <span data-key-char>{c}</span>
          </div>
        ))}
      </div>

      <div
        data-button
        data-on="true"
        className="mt-4 rounded-xl bg-teal-400 py-2.5 text-center text-[11px] font-semibold text-[#04211d] data-[on=false]:opacity-40"
      >
        <span data-button-label>Request sent</span>
      </div>

      <ol className="mt-5 space-y-2.5">
        {STEPS.map((text, i) => (
          <li key={text} className="flex items-center gap-2.5 text-[10px] text-white/60">
            <span
              data-step-dot
              data-done={i < 2 ? 'true' : 'false'}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-teal-300/40 text-[9px] font-semibold text-teal-200 transition-colors data-[done=true]:border-teal-300 data-[done=true]:bg-teal-300 data-[done=true]:text-[#04211d]"
            >
              {i + 1}
            </span>
            {text}
          </li>
        ))}
      </ol>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              data-status-ping
              className="absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-60"
              style={{ animation: 'l-ping 1.8s ease-out infinite' }}
            />
            <span data-status-dot className={statusDotClass('waiting')} />
          </span>
          <p data-status-title className="text-[10px] font-medium">{STATUS.waiting.title}</p>
        </div>
        <p data-status-note className="mt-1.5 text-[9px] leading-relaxed text-white/45">
          {STATUS.waiting.note}
        </p>
      </div>
    </div>
  );
}
