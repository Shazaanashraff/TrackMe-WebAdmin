import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ManagerSettingsPage } from '../ManagerSettingsPage';

function setup() {
  render(<MemoryRouter><ManagerSettingsPage /></MemoryRouter>);
}

describe('ManagerSettingsPage', () => {
  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
  });

  it('shows the under-development notice', () => {
    setup();
    expect(screen.getByText(/under development/i)).toBeInTheDocument();
  });

  it('renders the three planned feature sections', () => {
    setup();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
  });

  it('does not show fabricated metric stats', () => {
    setup();
    expect(screen.queryByText('Manager Settings')).toBeNull();
  });
});
