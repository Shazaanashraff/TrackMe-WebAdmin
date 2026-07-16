import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColorModeProvider } from '@/theme/ColorMode';
import { AppLoading } from '../AppLoading';

describe('AppLoading', () => {
  it('renders the wordmark and session restore message', () => {
    render(
      <ColorModeProvider>
        <AppLoading />
      </ColorModeProvider>,
    );
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText(/restoring session/i)).toBeInTheDocument();
  });
});
