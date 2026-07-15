import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { ColorModeProvider } from '../../theme/ColorMode';

function renderLayout() {
  return render(
    <ColorModeProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<SuperAdminLayout user={{ email: 'admin@trackme.com' }} onLogout={() => {}} onRefresh={() => {}} />}>
            <Route path="/dashboard" element={<div>dashboard content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ColorModeProvider>
  );
}

describe('SuperAdminLayout dark mode toggle', () => {
  it('renders a working dark-mode toggle that switches the icon and aria-label', async () => {
    const user = userEvent.setup();
    renderLayout();

    const toggle = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(toggle).toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
  });
});
