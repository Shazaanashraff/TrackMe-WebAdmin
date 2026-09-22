import { test, expect } from '@playwright/test';
import {
  loginAsSuperAdmin,
  mockAuthBackend,
  mockSuperAdminDashboardBackend,
  mockSuperAdminEnrollmentSchema,
} from './helpers';

/**
 * EnrollmentFormPage guards unsaved field changes with `useBlocker`, which only
 * works under a DATA router. The app used to mount a plain `BrowserRouter`, so
 * opening this page threw "useBlocker must be used within a data router" and
 * the ErrorBoundary replaced the entire shell. `src/main.jsx` now mounts
 * `createBrowserRouter`.
 *
 * The Vitest spec for this page mocks `useBlocker` away, so it cannot catch a
 * regression here. **This is the only test that exercises the real router**,
 * which is why it asserts the page merely LOADS as well as that the guard
 * fires. Do not delete it without replacing that coverage.
 *
 * Retargeted 2026-09-23 from `/manager/enrollment-form` to `/enrollment-form`:
 * the manager route was removed (a manager's own `organization` is only ever
 * set by a super-admin, so the page was unusable for them), and super-admin is
 * now the only surface that mounts this page.
 */
test.describe('enrollment form unsaved-changes guard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
    await mockAuthBackend(page);
    await mockSuperAdminDashboardBackend(page);
    await mockSuperAdminEnrollmentSchema(page);
  });

  test('loads without throwing on the real router', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('/enrollment-form');
    await page.waitForLoadState('networkidle');

    // The shell survives: an ErrorBoundary takeover removes <main> entirely.
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('heading', { name: /enrollment form/i })).toBeVisible();
    expect(errors, 'console or page errors while loading').toEqual([]);
  });

  test('blocks in-app navigation while there are unsaved changes', async ({ page }) => {
    await page.goto('/enrollment-form');
    await page.waitForLoadState('networkidle');

    await page.getByRole('checkbox').first().click();
    await expect(page.getByText(/unsaved changes/i).first()).toBeVisible();

    // Default (desktop) viewport, so the sidebar card is on screen and the
    // mobile Sheet is not mounted: exactly one Dashboard link.
    await page.getByRole('link', { name: /^dashboard$/i }).click();

    await expect(page.getByRole('heading', { name: /leave without saving\?/i })).toBeVisible();
    // Cancel keeps the super-admin on the form with the edit intact.
    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(page).toHaveURL(/\/enrollment-form$/);
    await expect(page.getByText(/unsaved changes/i).first()).toBeVisible();
  });

  test('lets the user leave once they confirm', async ({ page }) => {
    await page.goto('/enrollment-form');
    await page.waitForLoadState('networkidle');

    await page.getByRole('checkbox').first().click();
    await page.getByRole('link', { name: /^dashboard$/i }).click();
    await page.getByRole('button', { name: /^leave$/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
