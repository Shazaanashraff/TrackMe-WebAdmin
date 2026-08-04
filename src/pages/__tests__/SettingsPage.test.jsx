import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../SettingsPage';

function setup() {
  render(<MemoryRouter><SettingsPage /></MemoryRouter>);
}

describe('SettingsPage', () => {
  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
  });

  it('shows the under-development notice', () => {
    setup();
    expect(screen.getByText(/settings configuration is under development/i)).toBeInTheDocument();
  });

  it('renders the three planned feature sections', () => {
    setup();
    expect(screen.getByText('Access & Security')).toBeInTheDocument();
    expect(screen.getByText('Operations Alerts')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('shows suggestion items within each section', () => {
    setup();
    expect(screen.getByText(/enforce password rotation/i)).toBeInTheDocument();
    expect(screen.getByText(/trigger alerts when any vehicle rating/i)).toBeInTheDocument();
    expect(screen.getByText(/enable audit logging/i)).toBeInTheDocument();
  });

  it('does not show any fabricated metric numbers', () => {
    setup();
    // The old page had hardcoded "3", "2", "9" stat cards — these must not appear as standalone stats
    expect(screen.queryByText('Security Policies')).toBeNull();
    expect(screen.queryByText('Active Alerts')).toBeNull();
    expect(screen.queryByText('Recommended Actions')).toBeNull();
  });
});
