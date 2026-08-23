import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorModeProvider } from '@/theme/ColorMode';
import { ErrorBoundary } from '../ErrorBoundary';

function Bomb({ shouldThrow }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>Content OK</div>;
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

  // Issue #27: a synthetic `Bomb` throw only proves the catch path fires: it
  // doesn't prove the boundary actually lets a fixed page recover afterward.
  // Crash with a realistic malformed-API-payload shape instead, then simulate
  // what the mocked Reload button doesn't — a real reload discards this whole
  // tree and mounts a fresh one — and confirm the fallback UI's content is
  // gone and the real content is back, not just that the mock fired.
  it('recovers real content after a realistic malformed-payload crash and reload, not just the mocked reload call', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload });

    function RouteList({ payload }) {
      return <div>{payload.items.map((i) => i.name).join(', ')}</div>;
    }

    const { unmount } = render(
      <ColorModeProvider>
        <ErrorBoundary>
          <RouteList payload={{}} />
        </ErrorBoundary>
      </ColorModeProvider>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledOnce();

    unmount();
    render(
      <ColorModeProvider>
        <ErrorBoundary>
          <RouteList payload={{ items: [{ name: 'Route 4' }] }} />
        </ErrorBoundary>
      </ColorModeProvider>,
    );

    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    expect(screen.getByText('Route 4')).toBeInTheDocument();
  });
});
