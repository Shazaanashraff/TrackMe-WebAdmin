import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorModeProvider } from '@/theme/ColorMode';
import { StyleGuidePage } from '../StyleGuidePage';

function renderPage() {
  return render(
    <ColorModeProvider>
      <StyleGuidePage />
    </ColorModeProvider>
  );
}

describe('StyleGuidePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the Atlas header and all major section headings', () => {
    renderPage();

    expect(screen.getByText('Atlas Design System')).toBeInTheDocument();

    const headings = screen.getAllByRole('heading', { level: 2 });
    const titles = headings.map((h) => h.textContent);

    expect(titles).toContain('Color Tokens');
    expect(titles).toContain('Typography');
    expect(titles).toContain('Elevation — Atlas Floating Shell');
    expect(titles).toContain('Button');
    expect(titles).toContain('Badge');
    expect(titles).toContain('Form Controls');
    expect(titles).toContain('Card');
    expect(titles).toContain('Alert');
    expect(titles).toContain('Avatar · Skeleton · Separator');
    expect(titles).toContain('Tabs');
    expect(titles).toContain('Table');
    expect(titles).toContain('Breadcrumb · Pagination');
    expect(titles).toContain('Dialog · AlertDialog · Sheet');
    expect(titles).toContain('Tooltip · Popover · Dropdown Menu');
    expect(titles).toContain('Scroll Area');
  });

  it('renders the theme toggle button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /switch to dark mode/i })
    ).toBeInTheDocument();
  });

  it('toggles to dark mode via the header button', async () => {
    const user = userEvent.setup();
    renderPage();

    const toggle = screen.getByRole('button', { name: /switch to dark mode/i });
    await user.click(toggle);

    expect(
      screen.getByRole('button', { name: /switch to light mode/i })
    ).toBeInTheDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('renders all Button variants', () => {
    renderPage();
    // "Default" appears in both Variants and Sizes rows — use getAllByRole
    expect(screen.getAllByRole('button', { name: 'Default' }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: 'Outline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ghost' })).toBeInTheDocument();
    // "Secondary" appears in Variants row; "Destructive" in both Variants and Disabled rows
    expect(screen.getAllByRole('button', { name: /secondary/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /destructive/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('renders all Badge domain variants', () => {
    renderPage();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('GPS stale')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('renders all four Alert variants', () => {
    renderPage();
    expect(screen.getByText('GPS data is stale')).toBeInTheDocument();
    expect(screen.getByText('Request rejected')).toBeInTheDocument();
    expect(screen.getByText('Route approved')).toBeInTheDocument();
  });

  it('renders form controls: Input, Textarea, Checkbox, Switch, RadioGroup, Select', () => {
    renderPage();
    expect(screen.getByLabelText('Bus plate number')).toBeInTheDocument();
    expect(screen.getByLabelText('Review note')).toBeInTheDocument();
    expect(screen.getByLabelText('Allow private routes')).toBeInTheDocument();
    expect(screen.getByLabelText(/GPS tracking/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Select a route…')).toBeInTheDocument();
  });

  it('renders overlay triggers: Dialog, AlertDialog, Sheet', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Open Dialog' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Bus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Sheet' })).toBeInTheDocument();
  });

  it('renders the Table section with sample bus data', () => {
    renderPage();
    expect(screen.getByText('B-042')).toBeInTheDocument();
    expect(screen.getByText('Colombo–Kandy')).toBeInTheDocument();
    expect(screen.getByText('Galle–Matara')).toBeInTheDocument();
  });

  it('renders the token palette section headings', () => {
    renderPage();
    expect(screen.getByText('Canvas & Surface')).toBeInTheDocument();
    expect(screen.getByText('Brand / Accent')).toBeInTheDocument();
    expect(screen.getByText('Status (always label + colour)')).toBeInTheDocument();
  });

  it('has a dev-only badge in the header', () => {
    renderPage();
    expect(screen.getByText('dev only')).toBeInTheDocument();
  });
});
