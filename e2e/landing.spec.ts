import { test, expect, Page } from '@playwright/test';
import {
  loginAsManager,
  loginAsSuperAdmin,
  mockManagerBackend,
  mockManagerPortalData,
  mockSuperAdminDashboardBackend,
} from './helpers';

/**
 * The public landing page at `/`. Covers what unit tests cannot: the sticky
 * "How it works" stage really pins and swaps the phone between sides as the
 * page scrolls, nothing overflows on a phone, and a signed-in user is still
 * sent straight to their dashboard.
 */

// The page is a lazy chunk, so wait for the story to exist before measuring it.
const storyState = async (page: Page) => {
  await page.locator('#how-it-works').waitFor();
  return page.evaluate(() => {
    const el = document.getElementById('how-it-works')!;
    return { step: el.dataset.step, side: el.dataset.side };
  });
};

async function scrollToStoryStep(page: Page, step: number, vh = 900) {
  await page.locator('#how-it-works').waitFor();
  const top = await page.evaluate(
    () => document.getElementById('how-it-works')!.getBoundingClientRect().top + window.scrollY,
  );
  // Each step owns a quarter of the (stories - 1) viewports of sticky travel.
  await page.evaluate((y) => window.scrollTo(0, y), top + step * vh * 0.75 + 60);
  await expect.poll(async () => (await storyState(page)).step).toBe(String(step));
}

test.describe('Landing page — desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('renders every section with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Every shuttle.');
    await expect(page.locator('#what')).toBeAttached();
    await expect(page.locator('#how-it-works')).toBeAttached();
    await expect(page.locator('#join')).toBeAttached();
    await expect(page).toHaveTitle(/TrackMe/);
    expect(errors).toEqual([]);
  });

  test('the scroll story swaps the phone between sides, then becomes a laptop', async ({ page }) => {
    await page.goto('/');

    const sides: string[] = [];
    for (const step of [0, 1, 2, 3]) {
      await scrollToStoryStep(page, step);
      sides.push((await storyState(page)).side as string);
    }
    expect(sides).toEqual(['left', 'right', 'left', 'right']);

    // The stage stays pinned to the viewport the whole way through.
    const stageTop = await page.evaluate(
      () => document.querySelector('#how-it-works > div')!.getBoundingClientRect().top,
    );
    expect(stageTop).toBe(0);

    // The last step's copy is the manager one, and the portal shot is on screen.
    await expect(page.getByRole('heading', { name: /your whole fleet, on one screen/i })).toBeVisible();
  });

  test('has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    const [scroll, client] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scroll).toBeLessThanOrEqual(client);
  });

  test('the nav anchors scroll to their sections', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Landing' }).getByRole('link', { name: 'Get started' }).click();
    await expect(page.getByRole('heading', { name: /rider,\s*or a driver\?/i })).toBeInViewport();
  });

  test('manager sign in goes to the login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: /manager sign in/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the driver form rejects a bad email and is honest that nothing is connected yet', async ({ page }) => {
    await page.goto('/#join');
    const email = page.getByLabel('Your email');

    await email.fill('nope');
    await page.getByRole('button', { name: /get driver access/i }).click();
    await expect(page.getByRole('alert')).toContainText(/valid email/i);

    await email.fill('driver@example.com');
    await page.getByRole('button', { name: /get driver access/i }).click();
    await expect(page.getByText(/not connected yet, so nothing was sent/i)).toBeVisible();
  });
});

test.describe('Landing page — phone', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('stacks the story and has no horizontal overflow', async ({ page }) => {
    await page.goto('/');

    // Stacked layout: no sticky stage, so the section carries no step state.
    expect(await storyState(page)).toEqual({ step: undefined, side: undefined });

    // Walk the page so every reveal fires, then measure.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
    }
    const [scroll, client] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scroll).toBeLessThanOrEqual(client);
    await expect(page.getByRole('heading', { level: 3, name: /your whole fleet, on one screen/i })).toBeVisible();
  });
});

test.describe('Landing page — signed-in visitors', () => {
  test('a manager at / goes straight to their dashboard', async ({ page }) => {
    await loginAsManager(page);
    await mockManagerBackend(page);
    await mockManagerPortalData(page);

    await page.goto('/');

    await expect(page).toHaveURL(/\/manager\/dashboard$/);
  });

  test('a super-admin at / goes straight to their dashboard', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await mockSuperAdminDashboardBackend(page);

    await page.goto('/');

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
