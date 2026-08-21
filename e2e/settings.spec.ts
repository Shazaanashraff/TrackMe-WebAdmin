import { expect, test } from '@playwright/test';
import { loginAsManager, loginAsSuperAdmin, mockAuthBackend } from './helpers';

// Issue #6: both settings pages used to be static "under development"
// placeholders with zero real functionality. This covers the minimal
// self-service surface that replaced them — editing your own name and
// reaching the password-reset flow — for both roles.

test.describe('Manager settings', () => {
  test('updates the manager\'s own name and can reach the password-reset flow', async ({ page }) => {
    await loginAsManager(page);
    await mockAuthBackend(page);

    await page.goto('/manager/settings');

    const nameField = page.getByLabel(/^name$/i);
    await expect(nameField).toHaveValue('E2E Manager');
    await expect(page.getByLabel(/^email$/i)).toHaveValue('manager@example.com');
    await expect(page.getByLabel(/^email$/i)).toBeDisabled();

    await nameField.fill('Updated Manager Name');
    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(page.getByText(/profile updated/i)).toBeVisible();

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
