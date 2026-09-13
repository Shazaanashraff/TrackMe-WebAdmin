import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

// ── per-column cell styling ──────────────────────────────────────────────────

describe('DataTable: column cell class', () => {
  it('applies meta.cellClassName to that column only', () => {
    const columns = [
      { id: 'name', header: 'Name', accessorKey: 'name', meta: { cellClassName: 'align-top' } },
      { id: 'role', header: 'Role', accessorKey: 'role' },
    ];
    render(<DataTable columns={columns} data={makeRows(1)} />);

    const cells = screen.getAllByRole('cell');
    expect(cells[0]).toHaveClass('align-top');
    expect(cells[1]).not.toHaveClass('align-top');
    // The default alignment is untouched where no class is asked for.
    expect(cells[1]).toHaveClass('align-middle');
  });
});

// ── state machine ─────────────────────────────────────────────────────────────

describe('DataTable: state machine', () => {
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

  // Issue #27: totalCount is only ever a display label — actual page
  // navigation must still be driven off the real `data` array, even when a
  // caller's reported total doesn't match what was actually handed over.
  it('paginates by the real row count when totalCount undercounts the actual rows given', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLS} data={makeRows(15)} totalCount={5} />);

    expect(screen.getByText('Person 1')).toBeInTheDocument();
    expect(screen.getByText('Person 10')).toBeInTheDocument();
    expect(screen.queryByText('Person 11')).toBeNull();

    await user.click(screen.getByRole('button', { name: /next/i }));

    // The remaining real rows are still reachable even though totalCount
    // claimed there were only 5 in total.
    expect(screen.getByText('Person 11')).toBeInTheDocument();
    expect(screen.getByText('Person 15')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('handles a totalCount in the thousands without breaking the range display or page navigation', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLS} data={makeRows(25)} totalCount={3417} />);

    expect(screen.getByText('1–10 of 3417')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText('11–20 of 3417')).toBeInTheDocument();
    expect(screen.getByText('Person 11')).toBeInTheDocument();
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

// ── a11y ─────────────────────────────────────────────────────────────────────

describe('DataTable — a11y', () => {
  const sortData = [
    { id: '1', name: 'Charlie', role: 'admin' },
    { id: '2', name: 'Alice', role: 'admin' },
  ];

  it('sortable column headers have aria-sort="none" before any sort', () => {
    render(<DataTable columns={COLS} data={sortData} />);
    const headers = screen.getAllByRole('columnheader');
    headers.forEach((h) => expect(h).toHaveAttribute('aria-sort', 'none'));
  });

  it('aria-sort updates to ascending on first sort click', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLS} data={sortData} />);
    await user.click(screen.getByRole('button', { name: /name/i }));
    const nameHeader = screen.getAllByRole('columnheader')[0];
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('aria-sort updates to descending on second sort click', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={COLS} data={sortData} />);
    const btn = screen.getByRole('button', { name: /name/i });
    await user.click(btn);
    await user.click(btn);
    const nameHeader = screen.getAllByRole('columnheader')[0];
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
  });

  it('clickable row has tabIndex=0 and fires onRowClick on Enter', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable columns={COLS} data={makeRows(1)} onRowClick={onRowClick} />);
    const rows = screen.getAllByRole('row');
    const dataRow = rows[1];
    expect(dataRow).toHaveAttribute('tabindex', '0');
    dataRow.focus();
    await user.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledOnce();
  });

  it('clickable row fires onRowClick on Space', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable columns={COLS} data={makeRows(1)} onRowClick={onRowClick} />);
    const dataRow = screen.getAllByRole('row')[1];
    dataRow.focus();
    await user.keyboard(' ');
    expect(onRowClick).toHaveBeenCalledOnce();
  });
});

// ── offline state ────────────────────────────────────────────────────────────

describe('DataTable — offline', () => {
  function setOnline(value) {
    Object.defineProperty(navigator, 'onLine', { value, writable: true, configurable: true });
  }
  afterEach(() => setOnline(true));

  it('shows a calm OfflineCard instead of ErrorState when a fetch fails with no cached rows and the device is offline', () => {
    setOnline(false);
    render(<DataTable columns={COLS} data={[]} error={new Error('Failed to fetch')} onRetry={() => {}} />);
    expect(screen.getByText("Can't load this right now")).toBeInTheDocument();
    expect(screen.queryByText('Failed to load')).toBeNull();
  });

  it('still shows the red ErrorState for a no-data failure while online', () => {
    render(<DataTable columns={COLS} data={[]} error={new Error('boom')} onRetry={() => {}} />);
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.queryByText("Can't load this right now")).toBeNull();
  });

  it('keeps the rows and adds an "Offline — showing saved information" strip when a refetch fails offline', () => {
    setOnline(false);
    render(<DataTable columns={COLS} data={makeRows(3)} error={new Error('Failed to fetch')} onRetry={() => {}} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Person 1')).toBeInTheDocument();
    expect(screen.getByText(/offline — showing saved information/i)).toBeInTheDocument();
    expect(screen.queryByText('Failed to load')).toBeNull();
  });

  it('uses the online "Couldn\'t refresh" wording on a refetch failure while still online', () => {
    render(<DataTable columns={COLS} data={makeRows(3)} error={new Error('boom')} onRetry={() => {}} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText(/couldn.t refresh/i)).toBeInTheDocument();
  });

  it('wires the stale strip Retry link through to onRetry', async () => {
    setOnline(false);
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<DataTable columns={COLS} data={makeRows(2)} error={new Error('e')} onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
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
