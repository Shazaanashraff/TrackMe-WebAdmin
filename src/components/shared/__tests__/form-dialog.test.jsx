import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormDialog } from '../form-dialog';

function setup(props = {}) {
  const user = userEvent.setup();
  const defaults = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Add Manager',
    onSubmit: vi.fn(),
  };
  render(
    <FormDialog {...defaults} {...props}>
      <input name="email" placeholder="Email" />
    </FormDialog>,
  );
  return { user, onSubmit: props.onSubmit ?? defaults.onSubmit };
}

describe('FormDialog', () => {
  it('renders title', () => {
    setup();
    expect(screen.getByText('Add Manager')).toBeInTheDocument();
  });

  it('renders children', () => {
    setup();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
  });

  it('renders default submitLabel "Save"', () => {
    setup();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('renders custom submitLabel', () => {
    setup({ submitLabel: 'Create Manager' });
    expect(screen.getByRole('button', { name: /create manager/i })).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', async () => {
    const onSubmit = vi.fn();
    const { user } = setup({ onSubmit });
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('shows server error message when error prop is set', () => {
    setup({ error: 'Email already taken' });
    expect(screen.getByText('Email already taken')).toBeInTheDocument();
  });

  it('shows error.message for Error objects', () => {
    setup({ error: new Error('Server unavailable') });
    expect(screen.getByText('Server unavailable')).toBeInTheDocument();
  });

  it('disables submit when pending', () => {
    setup({ pending: true });
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('shows spinner when pending', () => {
    setup({ pending: true });
    // Dialog content renders in a Radix Portal (document.body), not the render container
    expect(document.body.querySelector('.animate-spin')).not.toBeNull();
  });

  it('does not render when open=false', () => {
    setup({ open: false });
    expect(screen.queryByText('Add Manager')).toBeNull();
  });
});
