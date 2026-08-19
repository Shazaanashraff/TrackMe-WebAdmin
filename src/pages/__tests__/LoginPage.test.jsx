import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../LoginPage';

describe('LoginPage', () => {
  it('submits the entered credentials and shows the Sri Lanka route map', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();

    render(<LoginPage onLogin={onLogin} loading={false} error="" />);

    await user.type(screen.getByLabelText(/^Email/), 'manager@trackme.com');
    await user.type(screen.getByLabelText(/^Password/), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(onLogin).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'manager@trackme.com', password: 'secret123', rememberMe: true })
    );

    expect(screen.getByRole('img', { name: /route network map of sri lanka/i })).toBeInTheDocument();
  });

  it('renders a second, decorative route map for the mobile background layer (issue #79)', () => {
    const { container } = render(<LoginPage onLogin={vi.fn()} loading={false} error="" />);

    // The visible desktop panel's map (accessible, found by getByRole above) plus this
    // decorative mobile-background copy — both present regardless of viewport since
    // MUI's responsive `display` is CSS-only and jsdom doesn't evaluate breakpoints.
    const maps = container.querySelectorAll('svg[aria-label*="route network map" i]');
    expect(maps).toHaveLength(2);

    // Exactly one is reachable by role — the desktop panel's real map. The mobile
    // background copy must sit inside an aria-hidden, non-interactive wrapper so it
    // never intercepts clicks meant for the form in front of it.
    expect(screen.getAllByRole('img', { name: /route network map of sri lanka/i })).toHaveLength(1);
    const decorativeWrapper = maps[1].closest('[aria-hidden="true"]');
    expect(decorativeWrapper).not.toBeNull();
    expect(decorativeWrapper).toHaveStyle({ pointerEvents: 'none' });
  });

  it('calls onForgotPassword and renders a server error when provided', async () => {
    const user = userEvent.setup();
    const onForgotPassword = vi.fn();

    render(<LoginPage onLogin={vi.fn()} loading={false} error="Invalid credentials" onForgotPassword={onForgotPassword} />);

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(onForgotPassword).toHaveBeenCalled();
  });

  it('never renders the removed live-stats overlay, contact-admin box, or subtitle', () => {
    render(<LoginPage onLogin={vi.fn()} loading={false} error="" />);

    expect(screen.queryByText(/live for every route/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/active routes? tracked live/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/contact admin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/secure access for trackme/i)).not.toBeInTheDocument();
  });

  it('shows the crossed-out eye while the password is hidden, and the open eye once revealed', async () => {
    const user = userEvent.setup();
    render(<LoginPage onLogin={vi.fn()} loading={false} error="" />);

    const passwordField = screen.getByLabelText(/^Password/);
    expect(passwordField).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show password/i }));

    expect(passwordField).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
  });
});
