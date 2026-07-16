import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../status-badge';

describe('StatusBadge — bus domain', () => {
  it('online → settled badge', () => {
    render(<StatusBadge status="online" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('idle → progress badge', () => {
    render(<StatusBadge status="idle" />);
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('offline → danger badge', () => {
    render(<StatusBadge status="offline" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
});

describe('StatusBadge — request domain', () => {
  it('pending → pending badge', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('approved → settled badge', () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('rejected → danger badge', () => {
    render(<StatusBadge status="rejected" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });
});

describe('StatusBadge — manager / route / GPS', () => {
  it('active → settled badge', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('suspended → danger badge', () => {
    render(<StatusBadge status="suspended" />);
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('public → progress badge', () => {
    render(<StatusBadge status="public" />);
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('private → pending badge', () => {
    render(<StatusBadge status="private" />);
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('stale → warning badge', () => {
    render(<StatusBadge status="stale" />);
    expect(screen.getByText('GPS Stale')).toBeInTheDocument();
  });

  it('fresh → settled badge', () => {
    render(<StatusBadge status="fresh" />);
    expect(screen.getByText('GPS Live')).toBeInTheDocument();
  });
});

describe('StatusBadge — edge cases', () => {
  it('unknown status renders secondary badge with raw value', () => {
    render(<StatusBadge status="unknown-xyz" />);
    expect(screen.getByText('unknown-xyz')).toBeInTheDocument();
  });

  it('custom label overrides default label', () => {
    render(<StatusBadge status="online" label="Bus is live" />);
    expect(screen.getByText('Bus is live')).toBeInTheDocument();
    expect(screen.queryByText('Online')).toBeNull();
  });

  it('uppercase status is normalised to lowercase', () => {
    render(<StatusBadge status="ONLINE" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('underscore status is normalised (in_progress)', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });
});
