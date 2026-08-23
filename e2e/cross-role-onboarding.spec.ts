import { expect, test } from '@playwright/test';
import {
  mockAuthBackend,
  mockSuperAdminDashboardBackend,
  mockSuperAdminManagersBackend,
  mockManagerBackend,
} from './helpers';

// The "set up a new customer" journey end to end, spanning both roles in one
// flow against a mocked backend: a super-admin creates a manager account,
// that manager then does a real click-through sign-in with the credentials
// just created (not a localStorage shortcut — the whole point is proving the
// account actually works), and creates their first vehicle.

const SUPER_ADMIN = { email: 'admin@trackme.com', password: 'secret123' };
const NEW_MANAGER = { name: 'Jordan Lee', email: 'jordan.lee@trackme.com', password: 'Sup3rSecret!' };

test.describe('Cross-role onboarding', () => {
  test('a super-admin creates a manager, who signs in and creates their first vehicle', async ({ page }) => {
    // Scripts the super-admin's login first. Once the new manager exists this
    // gets swapped for a route that authenticates them instead — Playwright
    // runs the most-recently-registered matching route, so the newer
    // registration below takes over without needing to touch this one.
    await mockAuthBackend(page, {
      loginResponse: {
        body: {
          success: true,
          token: 'e2e-sa-token',
          user: { _id: 'sa-1', name: 'E2E Admin', email: SUPER_ADMIN.email, role: 'super-admin' },
        },
      },
    });
    await mockSuperAdminDashboardBackend(page);
    const { managers } = await mockSuperAdminManagersBackend(page);

    await page.goto('/login');
    await page.getByLabel(/manager email/i).fill(SUPER_ADMIN.email);
    await page.getByLabel(/^password/i).fill(SUPER_ADMIN.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // --- Super-admin: create the manager ---
    await page.getByRole('link', { name: /managers/i }).click();
    await expect(page).toHaveURL(/\/managers$/);

    await page.getByRole('button', { name: /add manager/i }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel(/manager name/i).fill(NEW_MANAGER.name);
    await createDialog.getByLabel(/^email/i).fill(NEW_MANAGER.email);
    await createDialog.getByLabel(/^password/i).fill(NEW_MANAGER.password);
    await createDialog.getByLabel(/confirm password/i).fill(NEW_MANAGER.password);
    await createDialog.getByRole('button', { name: /create manager/i }).click();

    await expect(createDialog).not.toBeVisible({ timeout: 10_000 });
    expect(managers).toHaveLength(1);
    expect(managers[0]).toMatchObject({ name: NEW_MANAGER.name, email: NEW_MANAGER.email });
    await expect(page.getByText(NEW_MANAGER.email)).toBeVisible();

    // --- Hand off: sign out of the super-admin session ---
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    // From here on, /api/auth/login authenticates the manager just created.
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'e2e-new-mgr-token',
          user: { _id: 'mgr-2', name: NEW_MANAGER.name, email: NEW_MANAGER.email, role: 'admin' },
        }),
      })
    );
    const { vehicles, createRequests } = await mockManagerBackend(page);

    // --- New manager: real click-through sign-in with those credentials ---
    await page.getByLabel(/manager email/i).fill(NEW_MANAGER.email);
    await page.getByLabel(/^password/i).fill(NEW_MANAGER.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/manager\/dashboard$/);
    await expect(page.getByRole('heading', { name: NEW_MANAGER.name })).toBeVisible();

    // --- New manager: create their first vehicle ---
    await page.getByRole('link', { name: /vehicles/i }).click();
    await expect(page).toHaveURL(/\/manager\/vehicles$/);

    await page.getByRole('button', { name: /add vehicle/i }).click();
    const vehicleDialog = page.getByRole('dialog');
    await vehicleDialog.getByLabel(/vehicle id/i).fill('VEH-100');
    await vehicleDialog.getByLabel(/number plate/i).fill('CAB-1234');
    // Custom route (driver records): skips the route picker entirely, same as
    // e2e/custom-routes.spec.ts's create flow.
    await vehicleDialog.getByLabel(/custom route/i).click();
    await vehicleDialog.getByRole('button', { name: /continue/i }).click();
    // Driver step: left unassigned — not required to create the vehicle.
    await vehicleDialog.getByRole('button', { name: /continue/i }).click();
    await vehicleDialog.getByRole('button', { name: /create vehicle/i }).click();

    await expect(vehicleDialog).not.toBeVisible({ timeout: 10_000 });
    expect(createRequests).toHaveLength(0); // this is a vehicle, not a bus-account request
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0]).toMatchObject({ vehicleId: 'VEH-100', numberPlate: 'CAB-1234' });
    await expect(page.getByText('VEH-100')).toBeVisible();
  });
});
