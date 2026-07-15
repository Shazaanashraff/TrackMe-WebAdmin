import { describe, it, expect } from 'vitest';
import { lightTheme, darkTheme } from '../theme';

describe('theme tokens', () => {
  it('exposes a MUI theme with palette, typography and shape', () => {
    expect(lightTheme.palette.primary.main).toBe('#2f2f2f');
    expect(lightTheme.palette.primary.dark).toBe('#161616');
    expect(lightTheme.palette.primary.light).toBe('#4a4a4a');
    expect(lightTheme.palette.background.default).toBe('#f8f9fa');
    expect(lightTheme.typography.fontFamily).toContain('Uber Move');
    expect(lightTheme.shape.borderRadius).toBe(8);
  });

  it('exposes custom gradient and border tokens shared across surfaces', () => {
    expect(lightTheme.custom.gradients.primary).toBe('linear-gradient(310deg, #161616 0%, #4a4a4a 100%)');
    expect(lightTheme.custom.border).toBe('#d2d6da');
  });

  it('reuses the shared gradient token for the primary contained button', () => {
    expect(lightTheme.components.MuiButton.styleOverrides.containedPrimary.background).toBe(
      lightTheme.custom.gradients.primary
    );
  });

  it('exposes a dark-mode variant with a distinct palette', () => {
    expect(darkTheme.palette.mode).toBe('dark');
    expect(darkTheme.palette.background.default).toBe('#0b1220');
  });
});
