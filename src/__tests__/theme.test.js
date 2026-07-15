import { describe, it, expect } from 'vitest';
import { darkTheme } from '../theme';

describe('theme tokens', () => {
  it('exposes a MUI theme with palette, typography and shape', () => {
    expect(darkTheme.palette.primary.main).toBe('#2f2f2f');
    expect(darkTheme.palette.primary.dark).toBe('#161616');
    expect(darkTheme.palette.primary.light).toBe('#4a4a4a');
    expect(darkTheme.palette.background.default).toBe('#f8f9fa');
    expect(darkTheme.typography.fontFamily).toContain('Uber Move');
    expect(darkTheme.shape.borderRadius).toBe(8);
  });

  it('exposes custom gradient and border tokens shared across surfaces', () => {
    expect(darkTheme.custom.gradients.primary).toBe('linear-gradient(310deg, #161616 0%, #4a4a4a 100%)');
    expect(darkTheme.custom.border).toBe('#d2d6da');
  });

  it('reuses the shared gradient token for the primary contained button', () => {
    expect(darkTheme.components.MuiButton.styleOverrides.containedPrimary.background).toBe(
      darkTheme.custom.gradients.primary
    );
  });
});
