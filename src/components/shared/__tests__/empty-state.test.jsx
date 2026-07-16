import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { EmptyState } from '../empty-state';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No buses found" />);
    expect(screen.getByText('No buses found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="T" description="Add a bus to get started" />);
    expect(screen.getByText('Add a bus to get started')).toBeInTheDocument();
  });

  it('omits description when not provided', () => {
    const { container } = render(<EmptyState title="T" />);
    // only the title <p>, no description <p>
    const paras = container.querySelectorAll('p');
    expect(paras).toHaveLength(1);
  });

  it('renders icon container when icon provided', () => {
    const { container } = render(<EmptyState title="T" icon={Inbox} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('omits icon container when icon not provided', () => {
    const { container } = render(<EmptyState title="T" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders action slot when provided', () => {
    render(<EmptyState title="T" action={<button>Add Bus</button>} />);
    expect(screen.getByRole('button', { name: 'Add Bus' })).toBeInTheDocument();
  });

  it('omits action container when not provided', () => {
    render(<EmptyState title="T" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
