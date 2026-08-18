import { expect, test } from '@playwright/test';
import { loginAsSuperAdmin, mockSuperAdminRoutesBackend, MockSystemRoute } from './helpers';

// Issue #39: RoutesPage had no Edit, Deactivate/Activate, or Delete action despite
// the backend fully supporting all three. Covers the new actions end to end against
// a mocked backend (no live DB needed).

const WESTERN_ROUTE: MockSystemRoute = {
  routeId: 'RT-001',
  routeName: 'Colombo–Kandy',
  source: 'Colombo',
  destination: 'Kandy',
  distance: 115,
  fare: 350,
  serviceType: 'PUBLIC',
  province: 'Western',
  isActive: true,
};

async function drillIntoWestern(page: import('@playwright/test').Page) {
  await page.goto('/routes');
  await page.getByText('Western Province', { exact: true }).click();
  await expect(page.getByText('Colombo–Kandy')).toBeVisible();
}

test.describe('Super-admin edits, deactivates, and deletes a route', () => {
  test('edits a route\'s destination', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await mockSuperAdminRoutesBackend(page, { routes: [WESTERN_ROUTE] });
    await drillIntoWestern(page);

    await page.getByRole('button', { name: /^edit$/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /edit colombo–kandy/i })).toBeVisible();

    const destInput = dialog.getByLabel(/destination/i);
    await destInput.fill('Nuwara Eliya');
    await dialog.getByRole('button', { name: /save changes/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Nuwara Eliya')).toBeVisible();
  });

  test('deactivates then reactivates a route', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await mockSuperAdminRoutesBackend(page, { routes: [WESTERN_ROUTE] });
    await drillIntoWestern(page);

    await page.getByRole('button', { name: /deactivate/i }).click();
    await expect(page.getByRole('button', { name: /^activate$/i })).toBeVisible();

    await page.getByRole('button', { name: /^activate$/i }).click();
    await expect(page.getByRole('button', { name: /deactivate/i })).toBeVisible();
  });

  test('shows an inline error when a status toggle fails', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await mockSuperAdminRoutesBackend(page, { routes: [WESTERN_ROUTE] });
    await page.route(/\/api\/routes\/RT-001\/toggle$/, (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Route not found' }) })
    );
    await drillIntoWestern(page);

    await page.getByRole('button', { name: /deactivate/i }).click();
    await expect(page.getByText('Route not found')).toBeVisible();
  });

  test('deletes a route after confirming', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await mockSuperAdminRoutesBackend(page, { routes: [WESTERN_ROUTE] });
    await drillIntoWestern(page);

    await page.getByRole('button', { name: /^delete$/i }).click();
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog.getByText(/delete colombo–kandy/i)).toBeVisible();

    await confirmDialog.getByRole('button', { name: /delete route/i }).click();

    await expect(confirmDialog).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Colombo–Kandy')).not.toBeVisible();
  });
});
