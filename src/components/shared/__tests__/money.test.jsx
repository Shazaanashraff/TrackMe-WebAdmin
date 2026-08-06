import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Money, formatLKR } from '../money';

// A missing amount is written out as a word; the UI carries no em dashes.
describe('formatLKR', () => {
  it('returns None for null', () => {
    expect(formatLKR(null)).toBe('None');
  });

  it('returns None for undefined', () => {
    expect(formatLKR(undefined)).toBe('None');
  });

  it('returns None for NaN', () => {
    expect(formatLKR(NaN)).toBe('None');
  });

  it('formats a number amount (contains the digits)', () => {
    const result = formatLKR(1500);
    expect(result).toMatch(/1[,.]?500/);
  });

  it('formats zero', () => {
    const result = formatLKR(0);
    expect(result).toMatch(/0\.00/);
  });
});

describe('Money', () => {
  it('renders formatted amount', () => {
    render(<Money amount={2500} />);
    expect(screen.getByText(/2[,.]?500/)).toBeInTheDocument();
  });

  it('renders None for a null amount', () => {
    render(<Money amount={null} />);
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('applies tabular-nums class', () => {
    const { container } = render(<Money amount={100} />);
    expect(container.firstChild.className).toContain('tabular-nums');
  });
});
