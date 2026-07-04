import { expect, test } from '@playwright/test';
import { loginAsManager, mockManagerBackend, MockRoute, MockChangeRequest } from './helpers';

// Covers the custom-routes feature end to end against a mocked backend (no
// live DB needed): (a) creating a custom-route driver, (b) reviewing/naming a
// recorded route so it becomes reusable, and (c) Phase 2's off-route diff
// resolver (seeded route-change request -> diff -> Adopt new -> route updates).

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

test.describe('Manager reviews and names a recorded custom route', () => {
  const seededRoute: MockRoute = {
    routeId: 'CUST-ABC-1',
    visibility: 'PRIVATE',
    status: 'PENDING_NAMING',
    origin: 'RECORDED',
    distance: 3.4,
    stopsCount: 2,
    pathPolyline: '_p~iF~ps|U_ulLnnqC',
    stops: [{ lat: 6.9271, lng: 79.8612, stopName: 'Gate' }, { lat: 6.9371, lng: 79.8612, stopName: 'School' }],
    recordedMeta: { snapped: true },
  };

  test('names the route, sees it ACTIVE, and it is selectable for another driver', async ({ page }) => {
    await loginAsManager(page);
    await mockManagerBackend(page, { customRoutes: [seededRoute] });

    await page.goto('/manager/route-approvals');
    await expect(page.getByText('CUST-ABC-1')).toBeVisible();

    await page.getByRole('button', { name: /review & name/i }).click();
    const previewDialog = page.getByRole('dialog');
    await expect(previewDialog).toBeVisible();

    const activateButton = previewDialog.getByRole('button', { name: /name & activate/i });
    await expect(activateButton).toBeDisabled();

    await previewDialog.getByTestId('route-name-input').fill('Morning School Run');
    await expect(activateButton).toBeEnabled();
    await activateButton.click();

    await expect(previewDialog).not.toBeVisible({ timeout: 10_000 });
    // The list re-fetches PENDING_NAMING routes; the now-ACTIVE route disappears from it.
    await expect(page.getByText('CUST-ABC-1')).not.toBeVisible();

    // Selectable for another driver: appears in the Add Bus Request route dropdown.
    await page.goto('/manager/buses');
    await page.getByRole('button', { name: /add bus request/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: /^route$/i }).click();
    await expect(page.getByText(/Morning School Run \(CUST-ABC-1\) — Custom/i)).toBeVisible();
  });
});

test.describe('Manager resolves an off-route change request (Phase 2)', () => {
  const activeRoute: MockRoute = {
    routeId: 'CUST-XYZ-1',
    routeName: 'Afternoon Shuttle',
    visibility: 'PRIVATE',
    status: 'ACTIVE',
    origin: 'RECORDED',
    distance: 5,
    pathPolyline: '_p~iF~ps|U_ulLnnqC',
  };
  const seededChangeRequest: MockChangeRequest = {
    _id: 'crq-1',
    currentRouteId: {
      routeId: 'CUST-XYZ-1',
      routeName: 'Afternoon Shuttle',
      pathPolyline: '_p~iF~ps|U_ulLnnqC',
      stops: [],
      distance: 5,
    },
    candidate: { pathPolyline: '_ulLnnqC_mqNvxq`@', stops: [], distance: 5.4, snapped: true },
    deviation: { maxMeters: 300, fractionOff: 0.6, sampleCount: 12 },
    status: 'PENDING',
  };

  test('reviews the diff and adopting the candidate updates the route', async ({ page }) => {
    await loginAsManager(page);
    const { customRoutes } = await mockManagerBackend(page, {
      customRoutes: [activeRoute],
      changeRequests: [seededChangeRequest],
    });

    await page.goto('/manager/route-approvals');
    await expect(page.getByText('Afternoon Shuttle')).toBeVisible();
    await expect(page.getByText(/300 m/)).toBeVisible();

    await page.getByRole('button', { name: /review diff/i }).click();
    const diffDialog = page.getByRole('dialog');
    await expect(diffDialog).toBeVisible();
    await expect(diffDialog.getByTestId('current-route-map')).toBeVisible();
    await expect(diffDialog.getByTestId('candidate-route-map')).toBeVisible();

    await diffDialog.getByRole('button', { name: /adopt new/i }).click();
    await expect(diffDialog).not.toBeVisible({ timeout: 10_000 });

    // Request list re-fetches PENDING requests; the resolved one disappears.
    await expect(page.getByText('Afternoon Shuttle')).not.toBeVisible();
    expect(customRoutes.find((r) => r.routeId === 'CUST-XYZ-1')?.pathPolyline).toBe(
      seededChangeRequest.candidate.pathPolyline
    );
  });
});
