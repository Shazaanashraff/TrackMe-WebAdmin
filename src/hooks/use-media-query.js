import { useEffect, useState } from 'react';

const read = (query) => (
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false
);

/**
 * Live result of a CSS media query. Reports `false` where `matchMedia` does not
 * exist (jsdom, SSR), so callers fall back to the narrow/simple layout.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => read(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [query]);

  return matches;
}
