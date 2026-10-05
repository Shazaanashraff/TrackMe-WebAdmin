// Illustrative managed-profiles screen. Generic sample content, not real data.
const PROFILES = [
  { name: 'You', note: 'Account holder', tone: 'bg-teal-400/20 text-teal-200', badge: 'On the way' },
  { name: 'Nimal', note: 'Child · Grade 7', tone: 'bg-sky-400/20 text-sky-200', badge: 'At school' },
  { name: 'Sanduni', note: 'Employee', tone: 'bg-violet-400/20 text-violet-200', badge: 'Waiting' },
];

export default function ProfilesScreen() {
  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#0b1a1e] to-[#07100f] px-4 pb-4 pt-12 text-white">
      <p className="text-[9px] uppercase tracking-[0.18em] text-teal-300/80">Your riders</p>
      <h3 className="font-display mt-1 text-[17px] font-semibold leading-tight">Everyone, one login</h3>

      <ul className="mt-4 space-y-2">
        {PROFILES.map((p) => (
          <li key={p.name} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${p.tone}`}>
              {p.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium">{p.name}</p>
              <p className="truncate text-[9px] text-white/45">{p.note}</p>
            </div>
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[8px] text-white/70">{p.badge}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 rounded-2xl border border-dashed border-white/15 py-2.5 text-center text-[10px] text-white/55">
        + Add a rider
      </div>
    </div>
  );
}
