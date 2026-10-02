import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadForm } from '../LeadForm';
import { isValidEmail } from '../validation';

describe('isValidEmail', () => {
  it.each(['a@b.co', 'name.surname@example.com', '  padded@example.com  '])('accepts %s', (value) => {
    expect(isValidEmail(value)).toBe(true);
  });

  it.each(['', 'plain', 'a@b', '@example.com', 'a b@example.com', null, undefined])('rejects %s', (value) => {
    expect(isValidEmail(value)).toBe(false);
  });
});

describe('LeadForm', () => {
  it('blocks an invalid address, flags the field, and never calls onSubmit', async () => {
    const onSubmit = vi.fn();
    render(<LeadForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Your email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: /get driver access/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i);
    expect(screen.getByLabelText('Your email')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears the error as soon as the user edits the field', async () => {
    render(<LeadForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /get driver access/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Your email'), 'a');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('submits a trimmed valid address and shows the thank-you state', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LeadForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Your email'), '  driver@example.com ');
    await userEvent.click(screen.getByRole('button', { name: /get driver access/i }));

    expect(onSubmit).toHaveBeenCalledWith('driver@example.com');
    expect(await screen.findByRole('status')).toHaveTextContent(/thanks/i);
  });

  it('says so when the submission fails, and keeps the form usable', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'));
    render(<LeadForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Your email'), 'driver@example.com');
    await userEvent.click(screen.getByRole('button', { name: /get driver access/i }));

    expect(await screen.findByText(/nothing was sent/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get driver access/i })).toBeEnabled();
  });

  it('is honest that nothing was sent when no endpoint is connected yet', async () => {
    render(<LeadForm />);

    await userEvent.type(screen.getByLabelText('Your email'), 'driver@example.com');
    await userEvent.click(screen.getByRole('button', { name: /get driver access/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/not connected yet, so nothing was sent/i);
    expect(screen.queryByText(/thanks/i)).not.toBeInTheDocument();
  });
});
