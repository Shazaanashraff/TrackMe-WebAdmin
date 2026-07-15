import { describe, it, expect } from 'vitest';
import { formatLKR } from '../formatCurrency';

describe('formatLKR', () => {
  it('formats a whole number amount with the Rs. prefix and grouping', () => {
    expect(formatLKR(12500)).toBe('Rs. 12,500');
  });

  it('rounds fractional amounts to the nearest whole rupee', () => {
    expect(formatLKR(999.6)).toBe('Rs. 1,000');
  });

  it('treats missing/invalid amounts as zero', () => {
    expect(formatLKR(undefined)).toBe('Rs. 0');
    expect(formatLKR(null)).toBe('Rs. 0');
    expect(formatLKR(NaN)).toBe('Rs. 0');
  });
});
