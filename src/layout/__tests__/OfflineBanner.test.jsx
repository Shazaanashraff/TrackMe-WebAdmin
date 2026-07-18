import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from '../OfflineBanner';

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { value, writable: true, configurable: true });
}

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setOnline(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when online', () => {
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the offline banner when the offline event fires', () => {
    render(<OfflineBanner />);
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/no internet connection/i)).toBeInTheDocument();
  });

  it('shows "Back online" when connectivity is restored', () => {
    render(<OfflineBanner />);
    act(() => { window.dispatchEvent(new Event('offline')); });
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/back online/i)).toBeInTheDocument();
  });

  it('dismisses the "Back online" banner after 3 seconds', () => {
    const { container } = render(<OfflineBanner />);
    act(() => { window.dispatchEvent(new Event('offline')); });
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(screen.getByText(/back online/i)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(container.firstChild).toBeNull();
  });
});
