import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Settings2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TableSkeleton } from './table-skeleton';
import { ErrorState } from './error-state';
import { EmptyState } from './empty-state';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

function colLabel(col) {
  const h = col.columnDef.header;
  return typeof h === 'string' ? h : col.id;
}

export function DataTable({
  columns,
  data = [],
  isLoading,
  error,
  onRetry,
  onRowClick,
  emptyTitle = 'No results',
  emptyDescription,
  emptyAction,
  emptyIcon,
  skeletonRows = 8,
  renderMobileCard,
  totalCount,
}) {
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) return <TableSkeleton rows={skeletonRows} cols={columns.length} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  const hideableCols = table.getAllColumns().filter((c) => c.getCanHide());
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const rowCount = totalCount ?? data.length;
  const rangeStart = pageIndex * pageSize + 1;
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, rowCount);

  return (
    <div className="space-y-3">
      {/* Column visibility toolbar */}
      {hideableCols.length > 0 && (
        <div className="flex justify-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Settings2 className="h-3.5 w-3.5" aria-hidden />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-2">
              {hideableCols.map((col) => (
                <div key={col.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-surface-muted">
                  <Checkbox
                    id={`col-vis-${col.id}`}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  />
                  <label
                    htmlFor={`col-vis-${col.id}`}
                    className="text-sm cursor-pointer leading-none select-none"
                  >
                    {colLabel(col)}
                  </label>
                </div>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Mobile card list */}
      {renderMobileCard && (
        <div className="md:hidden divide-y divide-border rounded-xl border border-border overflow-hidden">
          {table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className={cn('p-4', onRowClick && 'cursor-pointer hover:bg-surface-muted/60')}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              {renderMobileCard(row.original)}
            </div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      <div
        className={cn(
          'rounded-xl border border-border overflow-hidden',
          renderMobileCard && 'hidden md:block',
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    aria-sort={
                      header.column.getCanSort()
                        ? header.column.getIsSorted() === 'asc'
                          ? 'ascending'
                          : header.column.getIsSorted() === 'desc'
                          ? 'descending'
                          : 'none'
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="-mx-1 flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          // opacity-40 on an already-muted glyph left the
                          // "sortable" affordance barely visible in dark mode.
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(onRowClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring')}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row.original); } } : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  // `meta.cellClassName` lets a column opt out of the default
                  // middle alignment: in a table where some cells are two lines
                  // and some are one, centring every cell staggers the first
                  // lines against each other.
                  <TableCell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>
            {rangeStart}–{rangeEnd} of {rowCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <span className="px-3 tabular-nums">
              {pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
