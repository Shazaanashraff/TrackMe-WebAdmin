import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle } from '@/components/ui/alert';

describe('ui primitives — token-driven, MUI-free', () => {
  it('Button renders variants via semantic token classes', () => {
    const { rerender } = render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn.className).toContain('bg-primary');
    expect(btn.className).toContain('text-primary-foreground');

    rerender(<Button variant="outline" size="sm">Cancel</Button>);
    const outline = screen.getByRole('button', { name: 'Cancel' });
    expect(outline.className).toContain('border-border');
    expect(outline.className).toContain('h-8');
  });

  it('Button asChild forwards classes onto the child element', () => {
    render(
      <Button asChild>
        <a href="/x">Link</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link.className).toContain('bg-primary');
  });

  it('Badge maps a domain status variant to its status token colour', () => {
    render(<Badge variant="settled">Online</Badge>);
    const badge = screen.getByText('Online');
    expect(badge.className).toContain('text-status-settled');
  });

  it('Input uses surface/border tokens and forwards props', () => {
    render(<Input placeholder="Search…" />);
    const input = screen.getByPlaceholderText('Search…');
    expect(input.className).toContain('bg-surface');
    expect(input.className).toContain('border-border');
  });

  it('Card composes header/title/content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Fleet</CardTitle>
        </CardHeader>
        <CardContent>22 buses</CardContent>
      </Card>
    );
    expect(screen.getByText('Fleet')).toBeInTheDocument();
    expect(screen.getByText('22 buses')).toBeInTheDocument();
  });

  it('Skeleton renders the pulse affordance', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    expect(container.firstChild.className).toContain('animate-pulse');
    expect(container.firstChild.className).toContain('bg-surface-muted');
  });

  it('Alert exposes role=alert and a warning variant', () => {
    render(
      <Alert variant="warning">
        <AlertTitle>GPS stale</AlertTitle>
      </Alert>
    );
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('text-status-warning');
    expect(screen.getByText('GPS stale')).toBeInTheDocument();
  });
});
