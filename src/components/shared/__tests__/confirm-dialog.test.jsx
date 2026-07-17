import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../confirm-dialog';

function setup(props = {}) {
  const user = userEvent.setup();
  const defaults = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Delete manager?',
    description: 'This cannot be undone.',
    onConfirm: vi.fn(),
  };
  render(<ConfirmDialog {...defaults} {...props} />);
  return { user, onConfirm: props.onConfirm ?? defaults.onConfirm };
}

describe('ConfirmDialog', () => {
  it('renders title and description', () => {
    setup();
    expect(screen.getByText('Delete manager?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('renders default confirmLabel "Confirm"', () => {
    setup();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('renders custom confirmLabel', () => {
    setup({ confirmLabel: 'Yes, delete' });
    expect(screen.getByRole('button', { name: /yes, delete/i })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn();
    const { user } = setup({ onConfirm });
    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('does not call onConfirm when pending', async () => {
    const onConfirm = vi.fn();
    const { user } = setup({ onConfirm, pending: true });
    const btn = screen.getByRole('button', { name: /confirm/i });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows spinner when pending', () => {
    setup({ pending: true });
    // Dialog content renders in a Radix Portal (document.body), not the render container
    expect(document.body.querySelector('.animate-spin')).not.toBeNull();
  });

  it('requires reason text when requireReason=true', async () => {
    const onConfirm = vi.fn();
    const { user } = setup({ onConfirm, requireReason: true });
    const btn = screen.getByRole('button', { name: /confirm/i });
    expect(btn).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'Duplicate account');
    expect(btn).not.toBeDisabled();
  });

  it('passes reason to onConfirm when requireReason=true', async () => {
    const onConfirm = vi.fn();
    const { user } = setup({ onConfirm, requireReason: true });
    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'Inactive');
    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith('Inactive');
  });

  it('passes undefined to onConfirm when requireReason=false', async () => {
    const onConfirm = vi.fn();
    const { user } = setup({ onConfirm });
    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it('does not render when open=false', () => {
    setup({ open: false });
    expect(screen.queryByText('Delete manager?')).toBeNull();
  });
});
