import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportMenu, toCsv } from '../export-menu';

// ── toCsv unit tests ──────────────────────────────────────────────────────────

describe('toCsv', () => {
  const cols = [
    { id: 'name', header: 'Name', accessorKey: 'name' },
    { id: 'role', header: 'Role', accessorKey: 'role' },
  ];
  const data = [
    { name: 'Alice', role: 'admin' },
    { name: 'Bob', role: 'manager' },
  ];

  it('generates header row', () => {
    const csv = toCsv(cols, data);
    expect(csv.split('\n')[0]).toBe('Name,Role');
  });

  it('generates data rows', () => {
    const csv = toCsv(cols, data);
    expect(csv).toContain('"Alice"');
    expect(csv).toContain('"admin"');
  });

  it('escapes double quotes in values', () => {
    const csv = toCsv(cols, [{ name: 'Say "hi"', role: 'x' }]);
    expect(csv).toContain('"Say ""hi"""');
  });
});

// ── ExportMenu component ──────────────────────────────────────────────────────

describe('ExportMenu', () => {
  let createObjectURL;
  let revokeObjectURL;
  let clickSpy;

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    // spy on anchor click without actually navigating
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('renders Export button', () => {
    render(<ExportMenu data={[]} columns={[]} filename="test" />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(<ExportMenu data={[]} columns={[]} />);
    await user.click(screen.getByRole('button', { name: /export/i }));
    expect(await screen.findByText(/download csv/i)).toBeInTheDocument();
  });

  it('triggers CSV download when "Download CSV" is clicked', async () => {
    const user = userEvent.setup();
    const cols = [{ id: 'name', header: 'Name', accessorKey: 'name' }];
    const data = [{ name: 'Alice' }];
    render(<ExportMenu data={data} columns={cols} filename="managers" />);
    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(await screen.findByText(/download csv/i));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
