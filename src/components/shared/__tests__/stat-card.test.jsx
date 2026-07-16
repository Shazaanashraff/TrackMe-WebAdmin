import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Bus } from 'lucide-react';
import { StatCard } from '../stat-card';

function wrap(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('StatCard', () => {
  it('renders label and value', () => {
    wrap(<StatCard label="Total Buses" value="42" />);
    expect(screen.getByText('Total Buses')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders hint when provided', () => {
    wrap(<StatCard label="L" value="0" hint="Updated 2 min ago" />);
    expect(screen.getByText('Updated 2 min ago')).toBeInTheDocument();
  });

  it('omits hint when not provided', () => {
    const { container } = wrap(<StatCard label="L" value="0" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders icon when provided', () => {
    wrap(<StatCard label="L" value="0" icon={Bus} />);
    // icon is aria-hidden svg — verify container renders (no error thrown)
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('renders up-trend value', () => {
    wrap(<StatCard label="L" value="0" trend={{ direction: 'up', value: '+12%' }} />);
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('renders down-trend value', () => {
    wrap(<StatCard label="L" value="0" trend={{ direction: 'down', value: '-5%' }} />);
    expect(screen.getByText('-5%')).toBeInTheDocument();
  });

  it('omits trend when not provided', () => {
    wrap(<StatCard label="L" value="7" />);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('shows skeleton rows when isLoading', () => {
    const { container } = wrap(<StatCard label="L" value="0" isLoading />);
    // skeleton divs have animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    // value text not present
    expect(screen.queryByText('0')).toBeNull();
  });

  it('wraps content in a link when href provided', () => {
    wrap(<StatCard label="L" value="5" href="/operations" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/operations');
  });

  it('renders as plain div (no link) without href', () => {
    wrap(<StatCard label="L" value="5" />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
