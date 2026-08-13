import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DeveloperPage } from '../DeveloperPage';
import * as devkit from '../../lib/devkit';
import { API_MODES, getApiMode } from '../../lib/apiMode';

vi.mock('../../lib/devkit');

const CATALOG = {
  counts: { total: 3, webAdmin: 2, backend: 1 },
  entries: [
    { id: 't1', repo: 'web-admin', file: 'src/lib/__tests__/formatCurrency.test.js', suite: ['formatLKR'], name: 'formats an amount', type: 'unit' },
    { id: 't2', repo: 'web-admin', file: 'src/lib/__tests__/formatCurrency.test.js', suite: ['formatLKR'], name: 'rejects invalid input', type: 'unit' },
    { id: 't3', repo: 'backend', file: 'tests/integration/auth.test.js', suite: ['login'], name: 'returns 401 on bad password', type: 'integration' },
  ],
  files: [
    { id: 'f1', repo: 'web-admin', file: 'src/lib/__tests__/formatCurrency.test.js', module: 'Dashboard', type: 'unit', testCount: 2 },
    { id: 'f2', repo: 'backend', file: 'tests/integration/auth.test.js', module: 'Auth', type: 'integration', testCount: 1 },
  ],
  gapReport: [
    { module: 'Dashboard', total: 2, happyPath: 1, invalidInput: 1, authz: 0, boundary: 0, load: 0, missing: ['authz', 'boundary', 'load'] },
    { module: 'Auth', total: 1, happyPath: 0, invalidInput: 0, authz: 1, boundary: 0, load: 0, missing: ['happyPath', 'invalidInput', 'boundary', 'load'] },
  ],
};

function jsonResponse(body) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
}

function setup() {
  return render(<MemoryRouter><DeveloperPage /></MemoryRouter>);
}

describe('DeveloperPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    devkit.fetchCatalog.mockResolvedValue(CATALOG);
    global.fetch = vi.fn(() => jsonResponse({ status: 'ok', mode: 'primary', dbName: 'test' }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading and the sandbox toggle', async () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /developer/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /toggle sandbox mode/i })).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  it('shows what the server itself reports for /health, not just the client toggle', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('primary')).toBeInTheDocument());
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('flips the stored api mode when the toggle is clicked', async () => {
    const user = userEvent.setup();
    setup();

    expect(getApiMode()).toBe(API_MODES.PRIMARY);

    await user.click(screen.getByRole('switch', { name: /toggle sandbox mode/i }));

    expect(getApiMode()).toBe(API_MODES.SANDBOX);
    expect(screen.getByText('Sandbox', { selector: 'span' })).toBeInTheDocument();
  });

  it('warns when the toggle says sandbox but the server does not', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() => expect(devkit.fetchCatalog).toHaveBeenCalled());

    await user.click(screen.getByRole('switch', { name: /toggle sandbox mode/i }));

    await waitFor(() =>
      expect(screen.getByText(/this tab is set to sandbox, but the server/i)).toBeInTheDocument()
    );
  });

  it('lists catalog files grouped by module, with case counts', async () => {
    setup();

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(screen.getByText('src/lib/__tests__/formatCurrency.test.js')).toBeInTheDocument();
    expect(screen.getByText('Auth')).toBeInTheDocument();
    expect(screen.getByText('tests/integration/auth.test.js')).toBeInTheDocument();
  });

  it('shows a fetch error instead of crashing when the runner is unreachable', async () => {
    devkit.fetchCatalog.mockRejectedValue(new Error('fetch failed'));
    setup();

    await waitFor(() =>
      expect(screen.getByText(/could not reach the devkit runner/i)).toBeInTheDocument()
    );
  });

  it('streams run output and reports the exit code, for an allowlisted catalog id only', async () => {
    const user = userEvent.setup();
    devkit.runTest.mockImplementation(async (testId, onEvent) => {
      expect(testId).toBe('f1');
      onEvent('stdout', 'PASS formatCurrency.test.js');
      onEvent('exit', { code: 0 });
    });

    setup();
    await waitFor(() => expect(screen.getByText('src/lib/__tests__/formatCurrency.test.js')).toBeInTheDocument());

    const row = screen.getByText('src/lib/__tests__/formatCurrency.test.js').closest('tr');
    await user.click(within(row).getByRole('button', { name: /run/i }));

    await waitFor(() => expect(screen.getByText(/PASS formatCurrency.test.js/)).toBeInTheDocument());
    expect(screen.getByText(/exit code 0/)).toBeInTheDocument();
  });

  it('renders the gap report with missing categories called out, not treated as failures', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() => expect(devkit.fetchCatalog).toHaveBeenCalled());

    await user.click(screen.getByRole('tab', { name: /gap report/i }));

    await waitFor(() => expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0));
    expect(screen.getByText('authz')).toBeInTheDocument();
  });

  it('runs the reset-sandbox action through the runner and shows its output', async () => {
    const user = userEvent.setup();
    devkit.resetSandbox.mockImplementation(async (onEvent) => {
      onEvent('stdout', 'Sandbox seed complete.');
      onEvent('exit', { code: 0 });
    });

    setup();
    await user.click(screen.getByRole('button', { name: /reset sandbox/i }));

    await waitFor(() => expect(screen.getByText(/Sandbox seed complete\./)).toBeInTheDocument());
    expect(devkit.resetSandbox).toHaveBeenCalledTimes(1);
  });
});
