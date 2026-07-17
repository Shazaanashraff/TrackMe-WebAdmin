import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '../AppShell';
import { darkTheme } from '../../theme';

const navItems = [
  { label: 'Overview', path: '/manager/dashboard', icon: <span /> },
  { label: 'Buses', path: '/manager/buses', icon: <span /> },
];
const accountItems = [
  { label: 'Profile', path: '/manager/settings', icon: <span /> },
];

function renderShell({ initialPath = '/manager/dashboard', notifications } = {}) {
  return render(
    <ThemeProvider theme={darkTheme}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            element={(
              <AppShell
                brandLabel="Manager"
                breadcrumbRoot="Manager"
                navItems={navItems}
                accountItems={accountItems}
                user={{ email: 'manager@trackme.com' }}
                onLogout={vi.fn()}
                onRefresh={vi.fn()}
                notifications={notifications}
              />
            )}
          >
            <Route path="/manager/dashboard" element={<div>Dashboard body</div>} />
            <Route path="/manager/settings" element={<div>Settings body</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('AppShell', () => {
  it('titles a nav route correctly', () => {
    renderShell({ initialPath: '/manager/dashboard' });
    expect(screen.getByRole('heading', { level: 6, name: 'Overview' })).toBeInTheDocument();
  });

  it('titles an account-page route correctly instead of falling back to the first nav item', () => {
    renderShell({ initialPath: '/manager/settings' });
    expect(screen.getByRole('heading', { level: 6, name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 6, name: 'Overview' })).not.toBeInTheDocument();
  });

  it('renders no dead search input', () => {
    const { container } = renderShell();
    expect(container.querySelector('input')).not.toBeInTheDocument();
  });

  it('renders no gear/settings icon button', () => {
    renderShell();
    expect(screen.queryByTestId('SettingsRoundedIcon')).not.toBeInTheDocument();
  });

  it('omits the notifications bell when no notifications prop is given', () => {
    renderShell();
    expect(screen.queryByTestId('notifications-bell')).not.toBeInTheDocument();
  });

  it('renders a real notifications bell that navigates when notifications is provided', () => {
    const onClick = vi.fn();
    renderShell({ notifications: { count: 3, onClick, testId: 'notifications-bell' } });
    const bell = screen.getByTestId('notifications-bell');
    fireEvent.click(bell);
    expect(onClick).toHaveBeenCalled();
  });

  it('opens a real avatar menu with Profile and Sign out', () => {
    renderShell();
    fireEvent.click(screen.getByLabelText('Account menu'));
    expect(screen.getByRole('menuitem', { name: /Sign out/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Profile/i })).toBeInTheDocument();
  });

  it('signs out from the avatar menu', () => {
    const onLogout = vi.fn();
    render(
      <ThemeProvider theme={darkTheme}>
        <MemoryRouter initialEntries={['/manager/dashboard']}>
          <Routes>
            <Route
              element={(
                <AppShell
                  brandLabel="Manager"
                  breadcrumbRoot="Manager"
                  navItems={navItems}
                  accountItems={accountItems}
                  user={{ email: 'manager@trackme.com' }}
                  onLogout={onLogout}
                  onRefresh={vi.fn()}
                />
              )}
            >
              <Route path="/manager/dashboard" element={<div>Dashboard body</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );
    fireEvent.click(screen.getByLabelText('Account menu'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Sign out/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});
