import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorModeProvider, useColorMode, COLOR_MODE_STORAGE_KEY } from '../ColorMode';

function Probe() {
  const { mode, toggleColorMode } = useColorMode();
  return (
    <button type="button" onClick={toggleColorMode}>
      mode:{mode}
    </button>
  );
}

describe('ColorModeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to light mode and applies the light theme background to the page', () => {
    render(
      <ColorModeProvider>
        <Probe />
      </ColorModeProvider>
    );

    expect(screen.getByText('mode:light')).toBeInTheDocument();
  });

  it('toggles to dark mode on click and persists the choice to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ColorModeProvider>
        <Probe />
      </ColorModeProvider>
    );

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('mode:dark')).toBeInTheDocument();
    expect(window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe('dark');
  });

  it('restores dark mode from localStorage on mount', () => {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, 'dark');

    render(
      <ColorModeProvider>
        <Probe />
      </ColorModeProvider>
    );

    expect(screen.getByText('mode:dark')).toBeInTheDocument();
  });
});
