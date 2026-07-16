import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardSkeleton } from '../card-skeleton';

describe('CardSkeleton', () => {
  it('has role="status"', () => {
    render(<CardSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has sr-only loading text', () => {
    render(<CardSkeleton />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders default 3 lines + header skeleton = 4 total', () => {
    const { container } = render(<CardSkeleton />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(4); // 1 header + 3 lines
  });

  it('renders custom line count', () => {
    const { container } = render(<CardSkeleton lines={2} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3); // 1 header + 2 lines
  });

  it('renders 1 line correctly', () => {
    const { container } = render(<CardSkeleton lines={1} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(2); // 1 header + 1 line
  });
});
