import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginShell } from '../App';

vi.mock('../api', () => ({
  adminApi: {
    login: vi.fn(),
  },
}));

function renderLoginShell(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LoginShell auth={null} setAuth={vi.fn()} />
    </MemoryRouter>
  );
}

describe('LoginShell', () => {
  it('shows no message by default', () => {
    renderLoginShell('/login');
    expect(screen.queryByText(/session expired/i)).not.toBeInTheDocument();
  });

  it('shows a session-expired message when redirected here after a dead session (issue #46)', () => {
    renderLoginShell('/login?reason=session_expired');
    expect(screen.getByText(/your session expired.*please sign in again/i)).toBeInTheDocument();
  });
});
