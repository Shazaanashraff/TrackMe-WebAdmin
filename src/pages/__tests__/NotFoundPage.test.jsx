import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotFoundPage } from '../NotFoundPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

function setup(role = 'super-admin') {
  return render(
    <MemoryRouter>
      <NotFoundPage role={role} />
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  it('renders the 404 heading and description', () => {
    setup();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByText(/doesn't exist or has been moved/i)).toBeInTheDocument();
  });

  it('navigates to /dashboard for super-admin', async () => {
    const user = userEvent.setup();
    setup('super-admin');
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to /manager/dashboard for admin', async () => {
    const user = userEvent.setup();
    setup('admin');
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/manager/dashboard');
  });
});
