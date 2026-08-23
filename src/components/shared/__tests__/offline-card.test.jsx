import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineCard } from '../offline-card';

describe('OfflineCard', () => {
  it('renders the calm offline heading and a default description', () => {
    render(<OfflineCard />);
    expect(screen.getByText("Can't load this right now")).toBeInTheDocument();
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });

  it('renders a custom description when provided', () => {
    render(<OfflineCard description="Live tracking needs a connection." />);
    expect(screen.getByText('Live tracking needs a connection.')).toBeInTheDocument();
  });

  it('omits the retry button when onRetry is not provided', () => {
    render(<OfflineCard />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('wires onRetry through the Try again button', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<OfflineCard onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
