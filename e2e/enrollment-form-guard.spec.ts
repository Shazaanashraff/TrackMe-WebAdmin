import { test, expect } from '@playwright/test';
import { loginAsManager, mockManagerBackend, mockManagerPortalData } from './helpers';

/**
 * EnrollmentFormPage guards unsaved field changes with `useBlocker`, which only
 * works under a DATA router. The app used to mount a plain `BrowserRouter`, so
 * opening this page threw "useBlocker must be used within a data router" and
 * the ErrorBoundary replaced the entire shell — the page was unreachable in
 * production. `src/main.jsx` now mounts `createBrowserRouter`.
 *
 * The Vitest spec for this page mocks `useBlocker` away, so it cannot catch a
 * regression here. This is the only test that exercises the real router, which
 * is why it asserts the page merely LOADS as well as that the guard fires.
 */
test.describe('enrollment form unsaved-changes guard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
    await mockManagerBackend(page);
    await mockManagerPortalData(page);
  });

  test('loads without throwing on the real router', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('/manager/enrollment-form');
    await page.waitForLoadState('networkidle');

    // The shell survives: an ErrorBoundary takeover removes <main> entirely.
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('heading', { name: /enrollment form/i })).toBeVisible();
    expect(errors, 'console or page errors while loading').toEqual([]);
  });

  test('blocks in-app navigation while there are unsaved changes', async ({ page }) => {
    await page.goto('/manager/enrollment-form');
    await page.waitForLoadState('networkidle');

    await page.getByRole('checkbox').first().click();
    await expect(page.getByText(/unsaved changes/i).first()).toBeVisible();

    // Default (desktop) viewport, so the sidebar card is on screen and the
    // mobile Sheet is not mounted: exactly one Overview link.
    await page.getByRole('link', { name: /^overview$/i }).click();

    await expect(page.getByRole('heading', { name: /leave without saving\?/i })).toBeVisible();
    // Cancel keeps the manager on the form with the edit intact.
    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(page).toHaveURL(/\/manager\/enrollment-form$/);
    await expect(page.getByText(/unsaved changes/i).first()).toBeVisible();
  });

  test('lets the manager leave once they confirm', async ({ page }) => {
    await page.goto('/manager/enrollment-form');
    await page.waitForLoadState('networkidle');

    await page.getByRole('checkbox').first().click();
    // Default (desktop) viewport, so the sidebar card is on screen and the
    // mobile Sheet is not mounted: exactly one Overview link.
    await page.getByRole('link', { name: /^overview$/i }).click();
    await page.getByRole('button', { name: /^leave$/i }).click();

    await expect(page).toHaveURL(/\/manager\/dashboard$/);
  });
});
