import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaleChip } from '../stale-chip';

afterEach(() => {
  vi.useRealTimers();
});

describe('StaleChip', () => {
  it('renders nothing without an updatedAt', () => {
    const { container } = render(<StaleChip />);
    expect(container).toBeEmptyDOMElement();
  });

  it('stays hidden when the data is fresh and online (normal operation is unchanged)', () => {
    const { container } = render(<StaleChip updatedAt={Date.now() - 1000} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('appears when offline, even if the data is only seconds old', () => {
    render(<StaleChip updatedAt={Date.now() - 2000} offline />);
    expect(screen.getByText(/updated just now/i)).toBeInTheDocument();
  });

  it('appears on its own once the data is older than the warn threshold', () => {
    render(<StaleChip updatedAt={Date.now() - 20 * 60 * 1000} />);
    expect(screen.getByText(/updated 20 min ago/i)).toBeInTheDocument();
  });

  it('always appears when loud, regardless of age', () => {
    render(<StaleChip updatedAt={Date.now() - 1000} loud label="Queue as of" />);
    expect(screen.getByText(/queue as of just now/i)).toBeInTheDocument();
  });

  it('respects a custom warnAfterMs', () => {
    const { container, rerender } = render(
      <StaleChip updatedAt={Date.now() - 90 * 1000} warnAfterMs={60 * 1000} />,
    );
    expect(container).not.toBeEmptyDOMElement();

    rerender(<StaleChip updatedAt={Date.now() - 30 * 1000} warnAfterMs={60 * 1000} />);
    expect(container).toBeEmptyDOMElement();
  });
});
