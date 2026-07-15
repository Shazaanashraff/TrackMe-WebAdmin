import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthCard } from '../AuthCard';
import { MAP_BG } from '../SriLankaRouteMap';

describe('AuthCard', () => {
  it('renders the title, subtitle, and children, and calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <AuthCard title="Reset your password" subtitle="Enter your email." onBack={onBack} backLabel="Back to sign in">
        <div>form content</div>
      </AuthCard>
    );

    expect(screen.getByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('form content')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('omits the back button when onBack is not provided', () => {
    render(
      <AuthCard title="Title" subtitle="Subtitle">
        <div>content</div>
      </AuthCard>
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses the same dark background as the sign-in page, matching the map component', () => {
    const { container } = render(
      <AuthCard title="Title" subtitle="Subtitle">
        <div>content</div>
      </AuthCard>
    );

    expect(getComputedStyle(container.firstChild).backgroundColor).toBe(hexToRgb(MAP_BG));
  });
});

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}
