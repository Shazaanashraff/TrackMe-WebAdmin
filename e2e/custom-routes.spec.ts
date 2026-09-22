import { expect, test } from '@playwright/test';
import { loginAsManager, mockManagerBackend } from './helpers';

// Covers the custom-routes feature end to end against a mocked backend (no
// live DB needed): creating a vehicle whose route the driver will record by
// driving it, rather than one picked from the route catalogue.
//
// The route-naming review flow and the Phase 2 off-route diff resolver used to
// be covered here too, but both lived on /manager/route-approvals, which was
// removed along with ManagerRouteApprovalsPage (see #23) — those two
// describe blocks are gone rather than pointing at a dead route.
//
// Retargeted 2026-09-22: this spec still drove /manager/buses and an "Add bus
// request" button, both of which disappeared when the page became
// ManagerVehiclesPage at /manager/vehicles. It had been failing since.

test.describe('Manager creates a custom-route vehicle', () => {
  test('submits routeMode CUSTOM without picking a route', async ({ page }) => {
    await loginAsManager(page);
    const { vehicleRequests, vehicles } = await mockManagerBackend(page);

    await page.goto('/manager/vehicles');
    await page.getByRole('button', { name: /add vehicle/i }).click();

    const dialog = page.getByRole('dialog');

    // --- Step 1: Vehicle Details ---
    await dialog.getByLabel(/vehicle id/i).fill('CUST-VEH-1');
    await dialog.getByLabel(/vehicle name/i).fill('School Shuttle');
    await dialog.getByLabel(/number plate/i).fill('CAB-1234');

    await dialog.getByLabel(/custom route \(driver records\)/i).click();
    // In custom mode the route picker is replaced by an explanation, so there
    // is nothing to select and nothing required.
    await expect(dialog.getByText(/driver will record the route/i)).toBeVisible();
    await expect(dialog.getByLabel(/^route$/i)).toHaveCount(0);

    await dialog.getByRole('button', { name: /continue/i }).click();

    // --- Step 2: Driver (optional) — deliberately left empty ---
    await dialog.getByRole('button', { name: /continue/i }).click();

    // --- Step 3: Review & Create. The mock's fleet starts empty, so this is
    // the manager's first vehicle and is created outright rather than
    // submitted for approval (hence "Create Vehicle", not "Submit Request").
    await dialog.getByRole('button', { name: /create vehicle/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    expect(vehicleRequests).toHaveLength(1);
    expect(vehicleRequests[0]).toMatchObject({
      vehicleId: 'CUST-VEH-1',
      numberPlate: 'CAB-1234',
      routeMode: 'CUSTOM',
    });
    // Custom mode must not smuggle a route id through.
    expect((vehicleRequests[0] as { routeId?: string }).routeId).toBeFalsy();

    expect(vehicles).toHaveLength(1);
    await expect(page.getByText('CUST-VEH-1')).toBeVisible();
  });
});
