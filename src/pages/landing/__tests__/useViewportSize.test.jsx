import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { meaningfulChange, useViewportSize } from '../motion/useViewportSize';

const resizeTo = async (width, height) => {
  window.innerWidth = width;
  window.innerHeight = height;
  await act(async () => {
    window.dispatchEvent(new Event('resize'));
    // The hook coalesces resizes into one animation frame.
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  });
};

const original = { w: window.innerWidth, h: window.innerHeight };

afterEach(() => {
  window.innerWidth = original.w;
  window.innerHeight = original.h;
});

describe('meaningfulChange', () => {
  it('ignores the address bar sliding away on a phone (a small height change)', () => {
    expect(meaningfulChange({ width: 390, height: 780 }, { width: 390, height: 844 })).toBe(false);
  });

  it('acts on any change of width', () => {
    expect(meaningfulChange({ width: 390, height: 844 }, { width: 391, height: 844 })).toBe(true);
  });

  it('acts on a large height change (a real resize or rotation)', () => {
    expect(meaningfulChange({ width: 900, height: 700 }, { width: 900, height: 1000 })).toBe(true);
  });

  it('treats an identical size as no change', () => {
    expect(meaningfulChange({ width: 1440, height: 900 }, { width: 1440, height: 900 })).toBe(false);
  });
});

describe('useViewportSize', () => {
  it('starts from the current window size', () => {
    window.innerWidth = 1100;
    window.innerHeight = 700;
    const { result } = renderHook(() => useViewportSize());
    expect(result.current).toEqual({ width: 1100, height: 700 });
  });

  it('follows a real resize', async () => {
    const { result } = renderHook(() => useViewportSize());
    await resizeTo(800, 1000);
    expect(result.current).toEqual({ width: 800, height: 1000 });
  });

  it('holds steady through address-bar wobble', async () => {
    window.innerWidth = 390;
    window.innerHeight = 844;
    const { result } = renderHook(() => useViewportSize());
    const before = result.current;

    await resizeTo(390, 770);

    expect(result.current).toBe(before);
  });

  it('stops listening when it unmounts', async () => {
    const { result, unmount } = renderHook(() => useViewportSize());
    unmount();
    await resizeTo(500, 500);
    expect(result.current.width).not.toBe(500);
  });
});
