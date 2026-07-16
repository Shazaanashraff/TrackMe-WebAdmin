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
});
