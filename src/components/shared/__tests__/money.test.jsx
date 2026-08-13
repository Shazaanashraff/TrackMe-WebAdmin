import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Money, formatLKR } from '../money';

// A missing amount renders as a real zero-currency figure, not the word "None" —
// it reads as "zero so far", not as a broken value (issue #58).
describe('formatLKR', () => {
  it('formats null as zero, not None', () => {
    const result = formatLKR(null);
    expect(result).not.toBe('None');
    expect(result).toMatch(/0\.00/);
  });

  it('formats undefined as zero, not None', () => {
    const result = formatLKR(undefined);
    expect(result).not.toBe('None');
    expect(result).toMatch(/0\.00/);
  });

  it('formats NaN as zero, not None', () => {
    const result = formatLKR(NaN);
    expect(result).not.toBe('None');
    expect(result).toMatch(/0\.00/);
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

  it('renders a zero amount, not None, for a null amount', () => {
    render(<Money amount={null} />);
    expect(screen.queryByText('None')).toBeNull();
    expect(screen.getByText(/0\.00/)).toBeInTheDocument();
  });

  it('applies tabular-nums class', () => {
    const { container } = render(<Money amount={100} />);
    expect(container.firstChild.className).toContain('tabular-nums');
  });
});
