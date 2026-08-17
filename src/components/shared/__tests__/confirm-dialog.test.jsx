import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders a string error message inline', () => {
    setup({ error: 'Something went wrong' });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders an Error object\'s message inline', () => {
    setup({ error: new Error('Server unavailable') });
    expect(screen.getByText('Server unavailable')).toBeInTheDocument();
  });

  it('renders no error text when error is not provided', () => {
    setup();
    expect(screen.queryByText(/server unavailable|something went wrong/i)).toBeNull();
  });

  it('does not show a character count when reasonMaxLength is unset', async () => {
    const { user } = setup({ requireReason: true });
    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'Some reason');
    expect(screen.queryByText(/\d+\/\d+/)).toBeNull();
  });

  it('shows a live character count when reasonMaxLength is set', async () => {
    const { user } = setup({ requireReason: true, reasonMaxLength: 20 });
    expect(screen.getByText('0/20')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'Duplicate');
    expect(screen.getByText('9/20')).toBeInTheDocument();
  });

  it('caps typed input at reasonMaxLength via the native textarea limit', async () => {
    const { user } = setup({ requireReason: true, reasonMaxLength: 5 });
    const textarea = screen.getByRole('textbox', { name: /reason/i });
    await user.type(textarea, 'This is way too long');
    expect(textarea).toHaveValue('This ');
    expect(screen.getByText('5/5')).toBeInTheDocument();
  });

  it('blocks confirm and shows an inline message when reason exceeds reasonMaxLength', async () => {
    const onConfirm = vi.fn();
    const { user } = setup({ onConfirm, requireReason: true, reasonMaxLength: 5 });
    const textarea = screen.getByRole('textbox', { name: /reason/i });
    fireEvent.change(textarea, { target: { value: 'This is way too long' } });
    const btn = screen.getByRole('button', { name: /confirm/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/reason is too long/i)).toBeInTheDocument();
    await user.click(btn);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
