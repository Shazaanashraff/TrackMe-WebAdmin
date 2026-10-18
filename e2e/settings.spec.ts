import { expect, test } from '@playwright/test';
import {
  loginAsManager, loginAsSuperAdmin, mockAuthBackend, mockManagerShellBackend,
} from './helpers';

// Issue #6: both settings pages used to be static "under development"
// placeholders with zero real functionality. This covers the minimal
// self-service surface that replaced them — editing your own name and
// reaching the password-reset flow — for both roles.

test.describe('Manager settings', () => {
  test('updates the manager\'s own name and can reach the password-reset flow', async ({ page }) => {
    await loginAsManager(page);
    await mockAuthBackend(page);
    // AppShell's pending-enrollment badge fires on every manager page. Left
    // unmocked it 401s, and api.js sends the browser to
    // /login?reason=session_expired before this page can be read.
    await mockManagerShellBackend(page);
    // The QR boarding card reads the manager's route list, then each route's
    // own document for its owner and switch state.
    const qrPatches: unknown[] = [];
    await page.route('**/api/manager/routes', (route) =>
      route.fulfill({ json: { success: true, data: [{ routeId: 'OWN-1', routeName: 'Own Route 1' }] } }));
    await page.route('**/api/routes/OWN-1', (route) =>
      route.fulfill({
        json: { success: true, data: { routeId: 'OWN-1', routeName: 'Own Route 1', managerId: 'mgr-1', qrEnabled: false } },
      }));
    await page.route('**/api/manager/routes/OWN-1/qr', async (route) => {
      qrPatches.push(route.request().postDataJSON());
      await route.fulfill({ json: { success: true, data: { routeId: 'OWN-1', qrEnabled: true } } });
    });

    await page.goto('/manager/settings');

    const nameField = page.getByLabel(/^name$/i);
    await expect(nameField).toHaveValue('E2E Manager');
    await expect(page.getByLabel(/^email$/i)).toHaveValue('manager@example.com');
    await expect(page.getByLabel(/^email$/i)).toBeDisabled();

    await nameField.fill('Updated Manager Name');
    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(page.getByText(/profile updated/i)).toBeVisible();

    const qr = page.getByRole('switch', { name: 'QR boarding for Own Route 1' });
    await expect(qr).not.toBeChecked();
    await qr.click();
    await expect(qr).toBeChecked();
    expect(qrPatches).toEqual([{ qrEnabled: true }]);

    await page.getByRole('button', { name: /change password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });
});

test.describe('Super-admin settings', () => {
  test('updates the super-admin\'s own name', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await mockAuthBackend(page);

    await page.goto('/settings');

    const nameField = page.getByLabel(/^name$/i);
    await expect(nameField).toHaveValue('E2E Admin');

    await nameField.fill('Updated Admin Name');
    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(page.getByText(/profile updated/i)).toBeVisible();
  });
});
