import { expect, test } from '@playwright/test';
import {
  loginAsManager,
  loginAsSuperAdmin,
  mockManagerBackend,
  mockSuperAdminDashboardBackend,
} from './helpers';

const json = (data: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(data),
});

// Real end-to-end coverage of the Settings page's one real capability today —
// self-service password change — for both roles. See TrackMe-WebAdmin#6.
test.describe('Settings — change password', () => {
  test('a super-admin changes their password', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await mockSuperAdminDashboardBackend(page);
    await page.route('**/api/auth/change-password', (route) =>
      route.fulfill(json({ success: true, message: 'Password updated successfully' }))
    );

    await page.goto('/settings');

    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await page.getByLabel(/^current password$/i).fill('OldP@ss1!');
    await page.getByLabel(/^new password$/i).fill('NewP@ss1!');
    await page.getByLabel(/^confirm new password$/i).fill('NewP@ss1!');
    await page.getByRole('button', { name: /update password/i }).click();

    await expect(page.getByText(/password updated/i)).toBeVisible();
  });

  test('a manager changes their password', async ({ page }) => {
    await loginAsManager(page);
    await mockManagerBackend(page);
    await page.route('**/api/auth/change-password', (route) =>
      route.fulfill(json({ success: true, message: 'Password updated successfully' }))
    );

    await page.goto('/manager/settings');

    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await page.getByLabel(/^current password$/i).fill('OldP@ss1!');
    await page.getByLabel(/^new password$/i).fill('NewP@ss1!');
    await page.getByLabel(/^confirm new password$/i).fill('NewP@ss1!');
    await page.getByRole('button', { name: /update password/i }).click();

    await expect(page.getByText(/password updated/i)).toBeVisible();
  });

  test('a wrong current password shows the server error inline and does not clear the form', async ({ page }) => {
    await loginAsManager(page);
    await mockManagerBackend(page);
    await page.route('**/api/auth/change-password', (route) =>
      route.fulfill(json({ success: false, message: 'Current password is incorrect' }, 401))
    );

    await page.goto('/manager/settings');
    await page.getByLabel(/^current password$/i).fill('WrongPass1!');
    await page.getByLabel(/^new password$/i).fill('NewP@ss1!');
    await page.getByLabel(/^confirm new password$/i).fill('NewP@ss1!');
    await page.getByRole('button', { name: /update password/i }).click();

    await expect(page.getByText(/current password is incorrect/i)).toBeVisible();
    await expect(page.getByLabel(/^new password$/i)).toHaveValue('NewP@ss1!');
  });

  test('mismatched new/confirm passwords are blocked client-side, no request sent', async ({ page }) => {
    await loginAsManager(page);
    await mockManagerBackend(page);
    let requestSent = false;
    await page.route('**/api/auth/change-password', (route) => {
      requestSent = true;
      route.fulfill(json({ success: true }));
    });

    await page.goto('/manager/settings');
    await page.getByLabel(/^current password$/i).fill('OldP@ss1!');
    await page.getByLabel(/^new password$/i).fill('NewP@ss1!');
    await page.getByLabel(/^confirm new password$/i).fill('Different1!');
    await page.getByRole('button', { name: /update password/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    expect(requestSent).toBe(false);
  });
});
