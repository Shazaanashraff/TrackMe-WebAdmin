import { useEffect } from 'react';

// The manager portal runs on a single typeface (Inter for body *and* headings);
// the super-admin side keeps Uber Move as its brand face. Both are expressed as
// token overrides under `.type-single` in index.css, so no component has to know
// which side it is rendering on.
//
// The class goes on <html> rather than a page wrapper because Radix renders
// dialogs, selects and dropdown menus through portals into document.body, so a
// wrapper-scoped variable would leave every popup on the other font. This is the
// same mechanism the dark-mode toggle uses (theme/ColorMode.jsx).
export const SINGLE_TYPE_CLASS = 'type-single';

export function useTypographyScope(enabled) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(SINGLE_TYPE_CLASS, Boolean(enabled));

    // Signing out (or switching roles) unmounts the shell, so drop the scope
    // and let the login screen and the other role start from the base tokens.
    return () => root.classList.remove(SINGLE_TYPE_CLASS);
  }, [enabled]);
}
