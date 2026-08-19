import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AsyncSection } from '../async-section';

describe('AsyncSection', () => {
  it('renders children when data is present and not loading', () => {
    render(
      <AsyncSection isLoading={false} data={[{ id: 1 }]}>
        <p>Vehicle list here</p>
      </AsyncSection>,
    );
    expect(screen.getByText('Vehicle list here')).toBeInTheDocument();
  });

  it('renders default CardSkeleton when isLoading with no loadingFallback', () => {
    render(
      <AsyncSection isLoading data={[{ id: 1 }]}>
        <p>never</p>
      </AsyncSection>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('never')).toBeNull();
  });

  it('renders custom loadingFallback when isLoading', () => {
    render(
      <AsyncSection isLoading loadingFallback={<p>Custom loading…</p>} data={[]}>
        <p>never</p>
      </AsyncSection>,
    );
    expect(screen.getByText('Custom loading…')).toBeInTheDocument();
  });

  it('renders ErrorState when error is present', () => {
    render(
      <AsyncSection isLoading={false} error={new Error('Fetch failed')} onRetry={() => {}}>
        <p>never</p>
      </AsyncSection>,
    );
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.queryByText('never')).toBeNull();
  });

  it('wires onRetry through to ErrorState', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <AsyncSection isLoading={false} error={new Error('err')} onRetry={onRetry}>
        <p>never</p>
      </AsyncSection>,
    );
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('keeps showing children with a stale-data banner when a background refetch fails after data already loaded (issue #21)', () => {
    render(
      <AsyncSection isLoading={false} error={new Error('Fetch failed')} data={[{ id: 1 }]} onRetry={() => {}}>
        <p>Vehicle list here</p>
      </AsyncSection>,
    );
    expect(screen.getByText(/couldn.t refresh/i)).toBeInTheDocument();
    expect(screen.getByText('Vehicle list here')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load')).not.toBeInTheDocument();
  });

  it('keeps showing children on refetch failure for non-array (object) data too', () => {
    render(
      <AsyncSection isLoading={false} error={new Error('Fetch failed')} data={{ total: 5 }} onRetry={() => {}}>
        <p>Snapshot here</p>
      </AsyncSection>,
    );
    expect(screen.getByText(/couldn.t refresh/i)).toBeInTheDocument();
    expect(screen.getByText('Snapshot here')).toBeInTheDocument();
  });

  it('still renders the full ErrorState when the error happens with no prior data at all', () => {
    render(
      <AsyncSection isLoading={false} error={new Error('Fetch failed')} data={null} onRetry={() => {}}>
        <p>never</p>
      </AsyncSection>,
    );
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.queryByText('never')).not.toBeInTheDocument();
  });

  it('wires onRetry through the stale-data banner Retry link', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <AsyncSection isLoading={false} error={new Error('err')} data={[{ id: 1 }]} onRetry={onRetry}>
        <p>Vehicle list here</p>
      </AsyncSection>,
    );
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders EmptyState when data is an empty array', () => {
    render(
      <AsyncSection isLoading={false} data={[]} emptyTitle="No vehicles yet">
        <p>never</p>
      </AsyncSection>,
    );
    expect(screen.getByText('No vehicles yet')).toBeInTheDocument();
    expect(screen.queryByText('never')).toBeNull();
  });

  it('renders EmptyState when isEmpty=true explicitly', () => {
    render(
      <AsyncSection isLoading={false} data={[{ id: 1 }]} isEmpty emptyTitle="Overridden empty">
        <p>never</p>
      </AsyncSection>,
    );
    expect(screen.getByText('Overridden empty')).toBeInTheDocument();
  });

  it('renders EmptyState when data is null', () => {
    render(
      <AsyncSection isLoading={false} data={null} emptyTitle="Nothing here">
        <p>never</p>
      </AsyncSection>,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders EmptyState with default title when emptyTitle not provided', () => {
    render(
      <AsyncSection isLoading={false} data={[]}>
        <p>never</p>
      </AsyncSection>,
    );
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('renders EmptyState description when provided', () => {
    render(
      <AsyncSection isLoading={false} data={[]} emptyTitle="T" emptyDescription="Add one now">
        <p>never</p>
      </AsyncSection>,
    );
    expect(screen.getByText('Add one now')).toBeInTheDocument();
  });
});
