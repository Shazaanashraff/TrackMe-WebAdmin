import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// `useBlocker` is stubbed because this spec renders the page bare, with no
// router at all. Be aware of what that costs: the stub means this file CANNOT
// catch a router-level regression, and it hid a real one — the app mounted a
// plain BrowserRouter, so the live page threw "useBlocker must be used within
// a data router" and the ErrorBoundary ate the whole shell while these tests
// stayed green. The real router path is covered by
// e2e/enrollment-form-guard.spec.ts; keep that spec alive.
vi.mock('react-router-dom', async (importActual) => ({
  ...(await importActual()),
  useOutletContext: () => ({ user: { role: 'manager' } }),
  useBlocker: () => ({ state: 'unblocked', proceed: vi.fn(), reset: vi.fn() }),
}));

vi.mock('@/hooks/use-enrollment-schema', () => ({
  useEnrollmentSchema: vi.fn(),
  useOrganizations: vi.fn(),
  useSaveEnrollmentSchema: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: vi.fn() }));

import { EnrollmentFormPage } from '../EnrollmentFormPage';
import { useEnrollmentSchema, useOrganizations, useSaveEnrollmentSchema } from '@/hooks/use-enrollment-schema';

const SCHEMA = {
  organization: { name: 'Ananda College', serviceType: 'SCHOOL' },
  schemaVersion: 3,
  fields: [
    { key: 'studentId', label: 'Student ID', enabled: true, required: false, order: 0 },
    { key: 'grade', label: 'Grade / Year', enabled: true, required: true, order: 1 },
  ],
};

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { value, writable: true, configurable: true });
}

function setup({ schema = SCHEMA, isLoading = false, error = null } = {}) {
  useOrganizations.mockReturnValue({ data: { data: [] } });
  useEnrollmentSchema.mockReturnValue({
    data: schema ? { data: schema } : undefined,
    isLoading,
    error,
    dataUpdatedAt: schema ? Date.parse('2026-08-27T09:00:00.000Z') : 0,
    refetch: vi.fn(),
  });
  useSaveEnrollmentSchema.mockReturnValue({ mutate: vi.fn(), isPending: false });
  return render(<EnrollmentFormPage />);
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => setOnline(true));

describe('EnrollmentFormPage — offline', () => {
  it('renders the cached schema and keeps it editable while offline', () => {
    setOnline(false);
    setup();
    expect(screen.getByText('Ananda College')).toBeInTheDocument();
    expect(screen.getByText('Student ID')).toBeInTheDocument();
  });

  it('disables Save and explains why while offline', () => {
    setOnline(false);
    setup();
    expect(screen.getByRole('button', { name: /save form/i })).toBeDisabled();
    expect(screen.getByText(/saving needs a connection/i)).toBeInTheDocument();
  });

  it('leaves Save enabled when online', () => {
    setup();
    expect(screen.getByRole('button', { name: /save form/i })).not.toBeDisabled();
  });

  it('shows a calm offline state when the schema has never loaded and the device is offline', () => {
    setOnline(false);
    setup({ schema: null, error: new Error('Failed to fetch') });
    expect(screen.getByText("Can't load this right now")).toBeInTheDocument();
    expect(screen.queryByText(/failed to fetch/i)).toBeNull();
  });

  it('flags unsaved edits once a field is changed', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.queryByText(/unsaved changes/i)).toBeNull();
    // Toggle the "Required" checkbox on the first field.
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    expect(screen.getAllByText(/unsaved changes/i).length).toBeGreaterThan(0);
  });
});
