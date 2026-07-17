import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Money, formatLKR } from '../money';

describe('formatLKR', () => {
  it('returns — for null', () => {
    expect(formatLKR(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(formatLKR(undefined)).toBe('—');
  });

  it('returns — for NaN', () => {
    expect(formatLKR(NaN)).toBe('—');
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

  it('renders — for null amount', () => {
    render(<Money amount={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('applies tabular-nums class', () => {
    const { container } = render(<Money amount={100} />);
    expect(container.firstChild.className).toContain('tabular-nums');
  });
});
