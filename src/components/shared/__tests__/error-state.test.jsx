import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState, humanizeError } from '../error-state';

describe('humanizeError', () => {
  it('returns fallback for null', () => {
    expect(humanizeError(null)).toBe('An unexpected error occurred.');
  });

  it('returns string errors verbatim', () => {
    expect(humanizeError('Custom error message')).toBe('Custom error message');
  });

  it('humanizes network errors', () => {
    expect(humanizeError(new Error('Network request failed'))).toMatch(/Network error/);
    expect(humanizeError(new Error('Failed to fetch'))).toMatch(/Network error/);
  });

  it('humanizes 401 errors', () => {
    expect(humanizeError(new Error('401 Unauthorized'))).toMatch(/Session expired/);
  });

  it('humanizes 404 errors', () => {
    expect(humanizeError(new Error('404 Not Found'))).toMatch(/not found/i);
  });

  it('humanizes 500 server errors', () => {
    expect(humanizeError(new Error('500 Internal Server Error'))).toMatch(/Server error/);
  });

  it('returns fallback for empty message', () => {
    expect(humanizeError(new Error(''))).toBe('An unexpected error occurred.');
  });

  // A real network/timeout failure's message varies by browser and cause
  // ("Failed to fetch", Safari's "Load failed", a timeout AbortError...) and
  // won't reliably contain the word "network" — api.js's request() only ever
  // sets error.status for a response that DID come back, so its absence is
  // what actually distinguishes "never reached the server" from a genuine
  // rejection (issue #76).
  it('treats a simulated network failure (no error.status, unrecognized message) as retry-worthy, distinct from a server rejection', () => {
    const networkFailure = new Error('The internet connection appears to be offline.');
    // No .status set — this is the point: a fetch()-level failure never gets one.
    expect(humanizeError(networkFailure)).toBe('Network error. Check your connection and try again.');
  });

  it('trusts error.status over message wording when both are present', () => {
    const serverRejection = new Error('offline');
    serverRejection.status = 404;
    expect(humanizeError(serverRejection)).toBe('The requested resource was not found.');
  });

  it('does not call a status-bearing rejection a network error even with an unrecognized message', () => {
    const validationError = new Error('Route name is required');
    validationError.status = 400;
    expect(humanizeError(validationError)).toBe('Route name is required');
  });
});

describe('ErrorState', () => {
  it('renders "Failed to load" heading', () => {
    render(<ErrorState error={new Error('Network error')} />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('renders humanized error message', () => {
    render(<ErrorState error={new Error('Network request failed')} />);
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it('renders string error directly', () => {
    render(<ErrorState error="Something went sideways" />);
    expect(screen.getByText('Something went sideways')).toBeInTheDocument();
  });

  it('shows retry button when onRetry provided', () => {
    render(<ErrorState error="err" onRetry={() => {}} />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onRetry when button clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState error="err" onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('omits retry button when onRetry not provided', () => {
    render(<ErrorState error="err" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows a distinct, retry-oriented message for a simulated network failure (issue #76)', () => {
    const networkFailure = new Error('Load failed');
    render(<ErrorState error={networkFailure} onRetry={() => {}} />);
    expect(screen.getByText('Network error. Check your connection and try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
