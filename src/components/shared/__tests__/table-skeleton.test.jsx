import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TableSkeleton } from '../table-skeleton';

describe('TableSkeleton', () => {
  it('has role="status"', () => {
    render(<TableSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has sr-only loading text', () => {
    render(<TableSkeleton />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders default 8 data rows plus 1 header row', () => {
    const { container } = render(<TableSkeleton />);
    // header row + 8 data rows = 9 flex rows
    const rows = container.querySelectorAll('.flex.items-center.gap-3');
    expect(rows).toHaveLength(9);
  });

  it('renders custom row count', () => {
    const { container } = render(<TableSkeleton rows={3} cols={2} />);
    const rows = container.querySelectorAll('.flex.items-center.gap-3');
    expect(rows).toHaveLength(4); // 3 data + 1 header
  });

  it('renders correct skeleton count for given rows × cols', () => {
    const { container } = render(<TableSkeleton rows={2} cols={3} />);
    // header: 3 skeletons; rows: 2 × 3 = 6; total = 9
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(9);
  });

  it('renders default 4 cols in header', () => {
    const { container } = render(<TableSkeleton />);
    // first row is the header row
    const headerRow = container.querySelector('.flex.items-center.gap-3');
    const headerCols = headerRow.querySelectorAll('.animate-pulse');
    expect(headerCols).toHaveLength(4);
  });
});
