import { useEffect, useState } from 'react';

// Strictly below Tailwind's `md` (768px), which is the shell's one
// mobile/desktop boundary: the same width where the sidebar becomes a Sheet
// (AppShell.jsx) and a DataTable becomes a card list.
const MOBILE_QUERY = '(max-width: 767.98px)';

/**
 * True while the viewport is narrower than Tailwind's `md`.
 *
 * Used where a `md:hidden` / `hidden md:block` pair is not good enough because
 * BOTH trees would sit in the DOM at once — duplicating interactive elements
 * (two "Edit" buttons per row for a screen reader) and doubling the per-row
 * render work. Prefer plain Tailwind variants for anything purely visual.
 *
 * Guarded for environments without `matchMedia` (jsdom before the testing
 * library patches it, SSR), where it reports desktop.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MOBILE_QUERY).matches
      : false
  ));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (event) => setIsMobile(event.matches);
    // Re-read on mount: the first paint may have used the SSR/guard default.
    setIsMobile(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);

  return isMobile;
}
