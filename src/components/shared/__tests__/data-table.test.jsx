import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '../data-table';

// ── helpers ──────────────────────────────────────────────────────────────────

const COLS = [
  { id: 'name', header: 'Name', accessorKey: 'name' },
  { id: 'role', header: 'Role', accessorKey: 'role' },
];

function makeRows(n) {
  return Array.from({ length: n }, (_, i) => ({ id: String(i + 1), name: `Person ${i + 1}`, role: 'admin' }));
}

function setup(props = {}) {
  const user = userEvent.setup();
  const utils = render(
    <DataTable columns={COLS} data={makeRows(3)} {...props} />,
  );
  return { user, ...utils };
}

// ── state machine ─────────────────────────────────────────────────────────────

describe('DataTable — state machine', () => {
  it('renders TableSkeleton when isLoading', () => {
    render(<DataTable columns={COLS} data={[]} isLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders ErrorState when error is set', () => {
    render(<DataTable columns={COLS} data={[]} error={new Error('oops')} />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('calls onRetry from ErrorState', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<DataTable columns={COLS} data={[]} error={new Error('e')} onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders EmptyState when data is empty', () => {
    render(<DataTable columns={COLS} data={[]} emptyTitle="No managers yet" />);
    expect(screen.getByText('No managers yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders the table when data is present', () => {
    setup();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});

// ── column headers & cells ────────────────────────────────────────────────────

describe('DataTable — headers and cells', () => {
  it('renders column headers', () => {
    setup();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('renders cell data for each row', () => {
    setup();
    expect(screen.getByText('Person 1')).toBeInTheDocument();
    expect(screen.getByText('Person 2')).toBeInTheDocument();
    expect(screen.getByText('Person 3')).toBeInTheDocument();
  });
});

// ── sorting ───────────────────────────────────────────────────────────────────

describe('DataTable — sorting', () => {
  const sortData = [
    { id: '1', name: 'Charlie', role: 'admin' },
    { id: '2', name: 'Alice', role: 'admin' },
    { id: '3', name: 'Bob', role: 'admin' },
  ];

  it('rows appear in original order by default', () => {
    render(<DataTable columns={COLS} data={sortData} />);
    const cells = screen.getAllByRole('cell');
    // first cell is 'Charlie'
    expect(cells[0]).toHaveTextContent('Charlie');
  });

  it('sorts ascending on first click of a sortable header', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLS} data={sortData} />);
    await user.click(screen.getByRole('button', { name: /name/i }));
    const cells = screen.getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('Alice');
  });

  it('sorts descending on second click', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLS} data={sortData} />);
    const sortBtn = screen.getByRole('button', { name: /name/i });
    await user.click(sortBtn); // asc
    await user.click(sortBtn); // desc
    const cells = screen.getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('Charlie');
  });
});

// ── row click ─────────────────────────────────────────────────────────────────

describe('DataTable — row click', () => {
  it('calls onRowClick with the row data', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable columns={COLS} data={makeRows(1)} onRowClick={onRowClick} />);
    const rows = screen.getAllByRole('row');
    // rows[0] = header, rows[1] = first data row
    await user.click(rows[1]);
    expect(onRowClick).toHaveBeenCalledOnce();
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });

  it('does not attach cursor-pointer without onRowClick', () => {
    setup();
    const rows = screen.getAllByRole('row');
    expect(rows[1].className).not.toContain('cursor-pointer');
  });
});

// ── pagination ────────────────────────────────────────────────────────────────

describe('DataTable — pagination', () => {
  it('does not show pagination when rows ≤ PAGE_SIZE', () => {
    setup({ data: makeRows(5) });
    expect(screen.queryByRole('button', { name: /previous/i })).toBeNull();
  });

  it('shows pagination controls when rows > PAGE_SIZE', () => {
    setup({ data: makeRows(15) });
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('previous button is disabled on first page', () => {
    setup({ data: makeRows(15) });
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('next page advances and previous becomes enabled', async () => {
    const user = userEvent.setup();
    setup({ data: makeRows(15) });
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
  });

  it('shows range text (1–10 of 15)', () => {
    setup({ data: makeRows(15) });
    expect(screen.getByText('1–10 of 15')).toBeInTheDocument();
  });

  it('uses totalCount prop for the range display', () => {
    render(<DataTable columns={COLS} data={makeRows(11)} totalCount={47} />);
    expect(screen.getByText('1–10 of 47')).toBeInTheDocument();
  });
});

// ── column visibility toolbar ─────────────────────────────────────────────────

describe('DataTable — column visibility', () => {
  it('renders Columns toggle button', () => {
    setup();
    expect(screen.getByRole('button', { name: /columns/i })).toBeInTheDocument();
  });

  it('opens visibility popover on click and shows column labels', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /columns/i }));
    // Popover content appears — should show both column labels as checkbox labels
    await waitFor(() => {
      expect(screen.getAllByRole('checkbox').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('hides a column when its checkbox is unchecked', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /columns/i }));
    const checkboxes = await screen.findAllByRole('checkbox');
    // uncheck the first column (Name)
    await user.click(checkboxes[0]);
    // Name header should disappear from the table
    await waitFor(() => {
      expect(screen.queryByRole('columnheader', { name: /^name$/i })).toBeNull();
    });
  });
});

// ── mobile card rendering ─────────────────────────────────────────────────────

describe('DataTable — mobile card', () => {
  it('renders mobile card content when renderMobileCard provided', () => {
    render(
      <DataTable
        columns={COLS}
        data={makeRows(2)}
        renderMobileCard={(row) => <span data-testid="mc">{row.name}</span>}
      />,
    );
    const cards = screen.getAllByTestId('mc');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Person 1');
  });
});
