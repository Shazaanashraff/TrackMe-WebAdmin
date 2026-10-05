// Illustrative "join a driver" screen. Generic sample content, not real data.
const KEY = ['T', 'M', '4', 'F', '7', 'K'];

export default function EnrollScreen() {
  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#0b1a1e] to-[#07100f] px-4 pb-4 pt-12 text-white">
      <p className="text-[9px] uppercase tracking-[0.18em] text-teal-300/80">Join a driver</p>
      <h3 className="font-display mt-1 text-[17px] font-semibold leading-tight">Enter your driver&apos;s key</h3>
      <p className="mt-1.5 text-[10px] leading-relaxed text-white/50">
        Your driver shares a short key. It links you to their shuttle.
      </p>

      <div className="mt-5 grid grid-cols-6 gap-1.5">
        {KEY.map((c, i) => (
          <div
            key={i}
            className="flex aspect-square items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] font-mono text-sm font-medium"
          >
            {c}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-teal-400 py-2.5 text-center text-[11px] font-semibold text-[#04211d]">
        Request to join
      </div>

      <ol className="mt-5 space-y-2.5">
        {['Get the key from your driver', 'Send your request', 'Your manager approves'].map((text, i) => (
          <li key={text} className="flex items-center gap-2.5 text-[10px] text-white/60">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-teal-300/40 text-[9px] font-semibold text-teal-200">
              {i + 1}
            </span>
            {text}
          </li>
        ))}
      </ol>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-60" style={{ animation: 'l-ping 1.8s ease-out infinite' }} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
          </span>
          <p className="text-[10px] font-medium">Waiting for approval</p>
        </div>
        <p className="mt-1.5 text-[9px] leading-relaxed text-white/45">
          This driver is private. Your fleet manager reviews every request.
        </p>
      </div>
    </div>
  );
}
