import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ManagerLayout } from '../ManagerLayout';
import { ColorModeProvider } from '../../theme/ColorMode';
import { adminApi } from '../../api';

vi.mock('../../api', () => ({
  adminApi: {
    getManagerCustomRoutes: vi.fn(() => Promise.resolve({ data: [] })),
    getRouteChangeRequests: vi.fn(() => Promise.resolve({ data: [] }))
  }
}));

function renderLayout() {
  return render(
    <ColorModeProvider>
      <MemoryRouter initialEntries={['/manager/dashboard']}>
        <Routes>
          <Route element={<ManagerLayout user={{ email: 'manager@trackme.com' }} onLogout={() => {}} onRefresh={() => {}} />}>
            <Route path="/manager/dashboard" element={<div>manager dashboard content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ColorModeProvider>
  );
}

describe('ManagerLayout dark mode toggle', () => {
  it('renders a working dark-mode toggle that switches the icon and aria-label', async () => {
    const user = userEvent.setup();
    renderLayout();

    const toggle = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(toggle).toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
    expect(adminApi.getManagerCustomRoutes).toHaveBeenCalled();
  });
});
