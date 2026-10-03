import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppReleasesPage } from '../AppReleasesPage';

vi.mock('@/hooks/use-app-releases', () => ({
  useAppReleaseHistory: vi.fn(),
  useCreateAppRelease: vi.fn(),
  useUpdateAppReleaseStatus: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import {
  useAppReleaseHistory, useCreateAppRelease, useUpdateAppReleaseStatus,
} from '@/hooks/use-app-releases';

const RELEASE_ACTIVE = {
  _id: 'rel1', app: 'driver', platform: 'android', version: '1.0.0', versionCode: 1,
  downloadUrl: '/downloads/driver-app-1.0.0.apk', releaseNotes: 'Initial release',
  mandatory: false, isActive: true, createdAt: '2026-10-01T00:00:00.000Z',
};
const RELEASE_RETRACTED = {
  _id: 'rel0', app: 'driver', platform: 'android', version: '0.9.0', versionCode: 0,
  downloadUrl: '/downloads/driver-app-0.9.0.apk', releaseNotes: 'Beta',
  mandatory: true, isActive: false, createdAt: '2026-09-01T00:00:00.000Z',
};

function makeMutation(overrides = {}) {
  return {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    variables: undefined,
    ...overrides,
  };
}

function defaultHooks({
  releases = [RELEASE_ACTIVE, RELEASE_RETRACTED], loading = false, error = null, createMut, updateMut,
} = {}) {
  useAppReleaseHistory.mockReturnValue({ data: { releases }, isLoading: loading, error, refetch: vi.fn() });
  useCreateAppRelease.mockReturnValue(createMut || makeMutation());
  useUpdateAppReleaseStatus.mockReturnValue(updateMut || makeMutation());
}

function setup(opts = {}) {
  defaultHooks(opts);
  const user = userEvent.setup();
  render(<MemoryRouter><AppReleasesPage /></MemoryRouter>);
  return { user };
}

describe('AppReleasesPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: /app releases/i })).toBeInTheDocument();
  });

  it('renders the create-release form fields', () => {
    setup();
    expect(screen.getByLabelText(/^version$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/version code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/download url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/release notes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register release/i })).toBeInTheDocument();
  });

  it('renders the history table with existing releases', () => {
    setup();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('0.9.0')).toBeInTheDocument();
  });

  it('validates required fields before submit', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /register release/i }));
    expect(await screen.findByText(/version is required/i)).toBeInTheDocument();
  });

  it('submits the create mutation with the correct payload', async () => {
    const createMut = makeMutation();
    const { user } = setup({ createMut });

    await user.type(screen.getByLabelText(/^version$/i), '1.0.1');
    await user.type(screen.getByLabelText(/version code/i), '2');
    await user.type(screen.getByLabelText(/download url/i), '/downloads/driver-app-1.0.1.apk');
    await user.type(screen.getByLabelText(/release notes/i), 'Bug fixes');
    await user.click(screen.getByRole('button', { name: /register release/i }));

    await waitFor(() => {
      expect(createMut.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          app: 'driver',
          platform: 'android',
          version: '1.0.1',
          versionCode: 2,
          downloadUrl: '/downloads/driver-app-1.0.1.apk',
          releaseNotes: 'Bug fixes',
          mandatory: false,
        }),
      );
    });
  });

  it('shows "Retract" for an active release and calls the status mutation', async () => {
    const updateMut = makeMutation();
    const { user } = setup({ updateMut });

    const retractButtons = screen.getAllByRole('button', { name: /^retract$/i });
    expect(retractButtons.length).toBeGreaterThan(0);
    await user.click(retractButtons[0]);

    await waitFor(() => {
      expect(updateMut.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: RELEASE_ACTIVE._id, isActive: false }),
      );
    });
  });

  it('shows "Reactivate" for a retracted release and calls the status mutation', async () => {
    const updateMut = makeMutation();
    const { user } = setup({ updateMut });

    const reactivateButtons = screen.getAllByRole('button', { name: /^reactivate$/i });
    expect(reactivateButtons.length).toBeGreaterThan(0);
    await user.click(reactivateButtons[0]);

    await waitFor(() => {
      expect(updateMut.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: RELEASE_RETRACTED._id, isActive: true }),
      );
    });
  });

  it('shows an inline error when create fails', async () => {
    const conflict = new Error('A release with this version already exists');
    const createMut = makeMutation({ mutateAsync: vi.fn().mockRejectedValue(conflict) });
    const { user } = setup({ createMut });

    await user.type(screen.getByLabelText(/^version$/i), '1.0.0');
    await user.type(screen.getByLabelText(/version code/i), '1');
    await user.type(screen.getByLabelText(/download url/i), '/downloads/driver-app-1.0.0.apk');
    await user.click(screen.getByRole('button', { name: /register release/i }));

    expect(await screen.findByText('A release with this version already exists')).toBeInTheDocument();
  });
});
