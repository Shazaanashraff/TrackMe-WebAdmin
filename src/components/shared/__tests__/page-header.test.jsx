import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../page-header';

describe('PageHeader', () => {
  it('renders the title as an h1', () => {
    render(<PageHeader title="Fleet Overview" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Fleet Overview' })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<PageHeader title="T" description="Real-time vehicle data" />);
    expect(screen.getByText('Real-time vehicle data')).toBeInTheDocument();
  });

  it('omits description element when not provided', () => {
    const { container } = render(<PageHeader title="T" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders actions slot', () => {
    render(<PageHeader title="T" actions={<button>Export</button>} />);
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('omits actions container when not provided', () => {
    const { container } = render(<PageHeader title="T" />);
    // only one child div (the text block) — no flex actions div
    const divs = container.querySelectorAll(':scope > div > div');
    expect(divs).toHaveLength(1);
  });
});
