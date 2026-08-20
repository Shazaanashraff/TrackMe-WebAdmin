import { expect, test } from '@playwright/test';
import { loginAsManager, mockManagerBackend } from './helpers';

// Covers the custom-routes feature end to end against a mocked backend (no
// live DB needed): creating a custom-route driver.
//
// The route-naming review flow and the Phase 2 off-route diff resolver used to
// be covered here too, but both lived on /manager/route-approvals, which was
// removed along with ManagerRouteApprovalsPage (see #23) — those two
// describe blocks are gone rather than pointing at a dead route.

test.describe('Manager creates a custom-route driver', () => {
  test('submits routeMode CUSTOM without picking a route', async ({ page }) => {
    await loginAsManager(page);
    const { createRequests } = await mockManagerBackend(page);

    await page.goto('/manager/buses');
    await page.getByRole('button', { name: /add bus request/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/bus id/i).fill('CUST-BUS-1');
    await dialog.getByLabel(/bus name/i).fill('School Shuttle');
    await dialog.getByLabel(/number plate/i).fill('SHT-001');
    await dialog.getByRole('button', { name: /custom route \(driver records\)/i }).click();

    // No route dropdown should be required/shown in custom mode.
    await expect(dialog.getByText(/driver will record the route/i)).toBeVisible();

    await dialog.getByLabel(/seat capacity/i).fill('25');
    await dialog.getByRole('button', { name: /continue/i }).click();

    await dialog.getByLabel(/initial password/i).fill('Sup3rSecret!');
    await dialog.getByRole('button', { name: /continue/i }).click();
    await dialog.getByRole('button', { name: /submit request/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
    expect(createRequests).toHaveLength(1);
    expect((createRequests[0] as any).routeMode).toBe('CUSTOM');
  });
});
