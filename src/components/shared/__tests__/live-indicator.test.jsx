import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveIndicator } from '../live-indicator';

describe('LiveIndicator', () => {
  it('renders "Live" label for live state', () => {
    render(<LiveIndicator state="live" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders "Stale" label for stale state', () => {
    render(<LiveIndicator state="stale" />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('renders "Offline" label for offline state', () => {
    render(<LiveIndicator state="offline" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('defaults to offline for unknown state', () => {
    render(<LiveIndicator state="unknown" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('defaults to offline when no state provided', () => {
    render(<LiveIndicator />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('has role="status" with aria-label matching state label', () => {
    render(<LiveIndicator state="live" />);
    expect(screen.getByRole('status', { name: 'Live' })).toBeInTheDocument();
  });

  it('renders ping element only for live state', () => {
    const { container } = render(<LiveIndicator state="live" />);
    expect(container.querySelector('.animate-ping')).not.toBeNull();
  });

  it('does not render ping element for stale state', () => {
    const { container } = render(<LiveIndicator state="stale" />);
    expect(container.querySelector('.animate-ping')).toBeNull();
  });
});
