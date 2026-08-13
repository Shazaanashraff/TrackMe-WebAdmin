import { expect, test } from '@playwright/test';
import { mockAuthBackend, mockSuperAdminDashboardBackend, mockManagerBackend } from './helpers';

// End-to-end coverage of the real login form, role-based post-login routing,
// the full forgot-password journey (request -> verify -> reset -> login), and
// the session-expiry redirect — none of which any other e2e spec exercises
// (the existing manager specs all bypass login via `loginAsManager`).

test.describe('Login', () => {
  test('a super-admin signs in and lands on the super-admin dashboard', async ({ page }) => {
    await mockAuthBackend(page, {
      loginResponse: {
        body: {
          success: true,
          token: 'e2e-sa-token',
          user: { _id: 'sa-1', name: 'E2E Admin', email: 'admin@trackme.com', role: 'super-admin' },
        },
      },
    });
    await mockSuperAdminDashboardBackend(page);

    await page.goto('/login');
    await page.getByLabel(/manager email/i).fill('admin@trackme.com');
    await page.getByLabel(/^password/i).fill('secret123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('a manager signs in and lands on the manager overview', async ({ page }) => {
    await mockAuthBackend(page, {
      loginResponse: {
        body: {
          success: true,
          token: 'e2e-mgr-token',
          user: { _id: 'mgr-1', name: 'E2E Manager', email: 'manager@trackme.com', role: 'admin' },
        },
      },
    });
    await mockManagerBackend(page);

    await page.goto('/login');
    await page.getByLabel(/manager email/i).fill('manager@trackme.com');
    await page.getByLabel(/^password/i).fill('secret123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/manager\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'E2E Manager' })).toBeVisible();
  });

  test('invalid credentials show an inline error and keep the user on the login page', async ({ page }) => {
    await mockAuthBackend(page, {
      loginResponse: { status: 401, body: { success: false, message: 'Invalid email or password' } },
    });

    await page.goto('/login');
    await page.getByLabel(/manager email/i).fill('nobody@trackme.com');
    await page.getByLabel(/^password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a role this portal does not serve is rejected client-side, even with a 200 response', async ({ page }) => {
    await mockAuthBackend(page, {
      loginResponse: {
        body: {
          success: true,
          token: 'e2e-rider-token',
          user: { _id: 'rider-1', name: 'Some Rider', email: 'rider@trackme.com', role: 'rider' },
        },
      },
    });

    await page.goto('/login');
    await page.getByLabel(/manager email/i).fill('rider@trackme.com');
    await page.getByLabel(/^password/i).fill('secret123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/reserved for authorized trackme administrative accounts/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

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

test.describe('Session expiry', () => {
  test('a 401 from the backend on a protected page clears the session and redirects to /login', async ({
    page,
  }) => {
    // Seed a manager session with NO refreshToken, so the app cannot silently
    // recover — the very first protected API call failing should log it out.
    //
    // Deliberately NOT using page.addInitScript here: this test triggers a
    // real `window.location.assign` navigation (handleUnauthorized does a
    // hard redirect, not a router push), and addInitScript re-runs on every
    // navigation — it would keep re-planting the dead session on the very
    // page we're navigating to and cause an infinite redirect loop. Seeding
    // via evaluate() after one real page load writes it exactly once.
    await page.goto('/login');
    await page.evaluate(() => {
      window.localStorage.setItem(
        'admin-auth',
        JSON.stringify({
          token: 'e2e-dead-token',
          accessToken: 'e2e-dead-token',
          user: { _id: 'mgr-1', name: 'E2E Manager', email: 'manager@trackme.com', role: 'admin' },
          rememberMe: true,
        })
      );
    });

    await page.route('**/api/manager/dashboard', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Not authorized, token failed' }),
      })
    );

    await page.goto('/manager/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    const stored = await page.evaluate(() => window.localStorage.getItem('admin-auth'));
    expect(stored).toBeNull();
  });
});
