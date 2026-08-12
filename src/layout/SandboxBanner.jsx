import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { API_MODES, getApiMode, subscribeApiMode } from '@/lib/apiMode';

// Persistent while sandbox is active — Stripe's test-mode banner is the model. A toggle
// you can forget you flipped is worse than no toggle. Lives inside AppShell (not a
// viewport-fixed overlay like OfflineBanner) so it only ever shows for an authenticated
// session and never fights OfflineBanner for the same fixed top-0 strip.
export function SandboxBanner() {
  const [mode, setMode] = useState(getApiMode);

  useEffect(() => subscribeApiMode(setMode), []);

  if (!import.meta.env.DEV || mode !== API_MODES.SANDBOX) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 px-4 py-1.5 bg-status-warning text-white text-xs font-medium shrink-0"
    >
      <FlaskConical className="h-3.5 w-3.5" aria-hidden />
      Sandbox mode — changes here never touch the real database.
    </div>
  );
}
