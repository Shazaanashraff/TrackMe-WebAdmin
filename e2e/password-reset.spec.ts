import { expect, test } from '@playwright/test';
import { mockAuthBackend } from './helpers';

// The full 3-screen forgot-password journey (request code -> verify code ->
// set new password) driven as one continuous flow against a mocked backend,
// plus the two ways it can go wrong: a rejected code, and losing all router
// state on a hard refresh mid-flow.

test.describe('Forgot password — full journey', () => {
  test('request code -> verify code -> set new password -> back at login', async ({ page }) => {
    await mockAuthBackend(page, {
      requestOtpResponse: { body: { success: true } },
      verifyOtpResponse: { body: { success: true, resetToken: 'e2e-reset-token' } },
      resetPasswordResponse: { body: { success: true } },
    });

    await page.goto('/login');
    await page.getByRole('button', { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);

    await page.getByLabel(/email/i).fill('manager@trackme.com');
    await page.getByRole('button', { name: /send recovery code/i }).click();

    await expect(page).toHaveURL(/\/forgot-password\/verify$/);
    await page.getByLabel(/recovery code/i).fill('123456');
    await page.getByRole('button', { name: /verify code/i }).click();

    await expect(page).toHaveURL(/\/forgot-password\/reset$/);
    await page.getByLabel(/^new password/i).fill('BrandNewPass1');
    await page.getByLabel(/^confirm password/i).fill('BrandNewPass1');
    await page.getByRole('button', { name: /reset password/i }).click();

    await expect(page).toHaveURL(/\/login$/);
  });

  test('an expired/invalid recovery code shows the server error and does not advance', async ({ page }) => {
    await mockAuthBackend(page, {
      requestOtpResponse: { body: { success: true } },
      verifyOtpResponse: { status: 400, body: { success: false, message: 'Code expired' } },
    });

    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill('manager@trackme.com');
    await page.getByRole('button', { name: /send recovery code/i }).click();

    await expect(page).toHaveURL(/\/forgot-password\/verify$/);
    await page.getByLabel(/recovery code/i).fill('000000');
    await page.getByRole('button', { name: /verify code/i }).click();

    await expect(page.getByText('Code expired')).toBeVisible();
    await expect(page).toHaveURL(/\/forgot-password\/verify$/);
  });

  test('refreshing the browser on the reset step loses the flow and asks the user to start over', async ({
    page,
  }) => {
    // No router state survives a hard navigation, which is exactly what a
    // refresh does — this documents the currently-real UX gap (tracked as a
    // separate issue) rather than a desired behavior.
    await page.goto('/forgot-password/reset');

    await expect(page.getByText(/start the recovery flow again/i)).toBeVisible();
  });
});
