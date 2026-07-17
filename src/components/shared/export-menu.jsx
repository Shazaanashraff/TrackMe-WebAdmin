import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function toCsv(columns, data) {
  const headers = columns.map((c) => (typeof c.header === 'string' ? c.header : c.id ?? ''));
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = c.accessorKey ? row[c.accessorKey] : '';
      return `"${String(val ?? '').replace(/"/g, '""')}"`;
    }),
  );
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportMenu({ data = [], columns = [], filename = 'export' }) {
  const handleCsv = () => downloadCsv(toCsv(columns, data), filename);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCsv}>
          <FileText className="h-4 w-4" aria-hidden />
          Download CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { toCsv };
