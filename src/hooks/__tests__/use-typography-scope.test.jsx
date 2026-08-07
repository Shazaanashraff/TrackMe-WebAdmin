import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTypographyScope, SINGLE_TYPE_CLASS } from '../use-typography-scope';

// The manager portal is single-typeface; the super-admin side keeps its brand
// heading font. The scope lives as a class on <html> so Radix portals (dialogs,
// selects, dropdowns) pick it up along with the page.

const hasScope = () => document.documentElement.classList.contains(SINGLE_TYPE_CLASS);

afterEach(() => {
  document.documentElement.classList.remove(SINGLE_TYPE_CLASS);
});

describe('useTypographyScope', () => {
  it('scopes the document when enabled', () => {
    renderHook(() => useTypographyScope(true));
    expect(hasScope()).toBe(true);
  });

  it('leaves the document alone when disabled', () => {
    renderHook(() => useTypographyScope(false));
    expect(hasScope()).toBe(false);
  });

  it('drops the scope on unmount, so signing out returns to the base tokens', () => {
    const { unmount } = renderHook(() => useTypographyScope(true));
    expect(hasScope()).toBe(true);

    unmount();
    expect(hasScope()).toBe(false);
  });

  it('follows the value when the signed-in role changes', () => {
    const { rerender } = renderHook(({ enabled }) => useTypographyScope(enabled), {
      initialProps: { enabled: false },
    });
    expect(hasScope()).toBe(false);

    rerender({ enabled: true });
    expect(hasScope()).toBe(true);

    rerender({ enabled: false });
    expect(hasScope()).toBe(false);
  });
});
