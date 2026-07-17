import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RelativeTime, getRelative, getAbsolute } from '../relative-time';

function wrap(ui) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

// ── getRelative unit tests ────────────────────────────────────────────────────

describe('getRelative', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-07-17T12:00:00Z').getTime());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "just now" for < 60s', () => {
    expect(getRelative(new Date('2026-07-17T11:59:30Z'))).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(getRelative(new Date('2026-07-17T11:45:00Z'))).toBe('15 min ago');
  });

  it('returns hours ago', () => {
    expect(getRelative(new Date('2026-07-17T09:00:00Z'))).toBe('3h ago');
  });

  it('returns days ago for < 7 days', () => {
    expect(getRelative(new Date('2026-07-14T12:00:00Z'))).toBe('3d ago');
  });

  it('returns month/day for ≥ 7 days', () => {
    const result = getRelative(new Date('2026-07-01T12:00:00Z'));
    expect(result).toMatch(/Jul\s+1/);
  });
});

// ── getAbsolute unit tests ────────────────────────────────────────────────────

describe('getAbsolute', () => {
  it('returns a formatted absolute time string', () => {
    const result = getAbsolute(new Date('2026-07-17T06:30:00Z'));
    // Should contain year and time info
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/Jul/);
  });
});

// ── RelativeTime component ────────────────────────────────────────────────────

describe('RelativeTime', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-07-17T12:00:00Z').getTime());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders relative text', () => {
    wrap(<RelativeTime date={new Date('2026-07-17T11:45:00Z')} />);
    expect(screen.getByText('15 min ago')).toBeInTheDocument();
  });

  it('renders a <time> element with dateTime attribute', () => {
    wrap(<RelativeTime date={new Date('2026-07-17T11:45:00Z')} />);
    const el = screen.getByText('15 min ago');
    expect(el.tagName).toBe('TIME');
    expect(el).toHaveAttribute('dateTime');
  });

  it('returns null when date is falsy', () => {
    const { container } = wrap(<RelativeTime date={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
