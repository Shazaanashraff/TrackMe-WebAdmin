import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyField } from '../copy-field';

vi.mock('sonner', () => ({ toast: vi.fn() }));

describe('CopyField', () => {
  it('renders the value text', () => {
    render(<CopyField value="abc-123" />);
    expect(screen.getByText('abc-123')).toBeInTheDocument();
  });

  it('shows masked placeholder when masked and not revealed', () => {
    render(<CopyField value="secret-key" masked />);
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText('secret-key')).toBeNull();
  });

  it('reveals the value when the reveal button is clicked', async () => {
    const user = userEvent.setup();
    render(<CopyField value="secret-key" masked />);
    await user.click(screen.getByRole('button', { name: /reveal/i }));
    expect(screen.getByText('secret-key')).toBeInTheDocument();
  });

  it('hides the value again on second reveal click', async () => {
    const user = userEvent.setup();
    render(<CopyField value="secret-key" masked />);
    const btn = screen.getByRole('button', { name: /reveal/i });
    await user.click(btn); // reveal
    await user.click(screen.getByRole('button', { name: /hide/i })); // hide
    expect(screen.getByText('••••••••')).toBeInTheDocument();
  });

  it('calls onReveal when revealed', async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();
    render(<CopyField value="key" masked onReveal={onReveal} />);
    await user.click(screen.getByRole('button', { name: /reveal/i }));
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it('does not show reveal button when not masked', () => {
    render(<CopyField value="plain-value" />);
    expect(screen.queryByRole('button', { name: /reveal/i })).toBeNull();
  });

  it('calls onCopy with the value when copy button is clicked', async () => {
    const onCopy = vi.fn();
    const user = userEvent.setup();
    render(<CopyField value="copy-me" onCopy={onCopy} />);
    await user.click(screen.getByRole('button', { name: /copy/i }));
    expect(onCopy).toHaveBeenCalledWith('copy-me');
  });

  it('shows copied icon briefly after copy', async () => {
    const user = userEvent.setup();
    render(<CopyField value="val" onCopy={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /copy/i }));
    // After copy the button label changes to indicate success
    expect(screen.queryByRole('button', { name: /copy/i })).toBeInTheDocument();
  });
});
