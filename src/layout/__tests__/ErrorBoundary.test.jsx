import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorModeProvider } from '@/theme/ColorMode';
import { ErrorBoundary } from '../ErrorBoundary';

function Bomb({ shouldThrow }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>Content OK</div>;
}

// A crash shaped like a real one this boundary actually has to catch: a
// component rendering a malformed API payload (a list field the response
// omitted) rather than a synthetic thrown Error.
function RouteList({ payload }) {
  return (
    <ul>
      {payload.routes.map((r) => (
        <li key={r.id}>{r.name}</li>
      ))}
    </ul>
  );
}

function renderBoundary(shouldThrow = false) {
  return render(
    <ColorModeProvider>
      <ErrorBoundary>
        <Bomb shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </ColorModeProvider>,
  );
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('renders children when there is no error', () => {
    renderBoundary(false);
    expect(screen.getByText('Content OK')).toBeInTheDocument();
  });

  it('shows the fallback UI when a child throws', () => {
    renderBoundary(true);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/reload the page/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('calls window.location.reload on the Reload button click', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload });

    renderBoundary(true);
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledOnce();
  });

  it('catches a realistic malformed-API-payload crash, and the page actually recovers after reload — not just that the mock fired', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload });

    // A response missing the `routes` array a real backend contract expects —
    // this is the kind of undefined.map() crash the audit called out, not the
    // synthetic Bomb component the rest of this file throws.
    const { unmount } = render(
      <ColorModeProvider>
        <ErrorBoundary>
          <RouteList payload={{}} />
        </ErrorBoundary>
      </ColorModeProvider>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledOnce();

    // window.location.reload is mocked (jsdom cannot actually navigate), so it
    // does nothing by itself here. What makes Reload a real recovery path is
    // that a genuine reload tears down and remounts the whole React tree with
    // fresh state — this class boundary has no internal "try again" reset of
    // its own. Simulate that teardown/remount (as the retried request would
    // now return a well-formed payload) and confirm the fallback actually
    // clears rather than a stale "Something went wrong" persisting forever.
    unmount();
    render(
      <ColorModeProvider>
        <ErrorBoundary>
          <RouteList payload={{ routes: [{ id: 'r1', name: 'Route 12' }] }} />
        </ErrorBoundary>
      </ColorModeProvider>,
    );

    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    expect(screen.getByText('Route 12')).toBeInTheDocument();
  });
});
