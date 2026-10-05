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

test.describe('Landing page — the route rail', () => {
  const rail = (page: Page) => page.locator('[data-progress]');

  async function jumpTo(page: Page, id: string) {
    await page.locator('#' + id).waitFor();
    await page.evaluate((target) => {
      const top = document.getElementById(target)!.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top);
    }, id);
  }

  test('the shuttle follows the scroll and lights each stop as it arrives', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(rail(page)).toHaveAttribute('data-stop', '0');

    const seen: string[] = [];
    for (const id of ['what', 'how-it-works', 'join']) {
      await jumpTo(page, id);
      await expect.poll(async () => Number(await rail(page).getAttribute('data-stop'))).toBeGreaterThan(seen.length);
      seen.push((await rail(page).getAttribute('data-stop')) as string);
    }
    // Strictly advancing: what -> how it works -> join.
    expect(seen.map(Number)).toEqual([...seen.map(Number)].sort((a, b) => a - b));

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(async () => Number(await rail(page).getAttribute('data-progress'))).toBeGreaterThan(0.98);
    await expect(page.locator('[data-reached="true"]')).toHaveCount(3);
  });

  test('is invisible at the top of the page and never blocks a tap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(rail(page)).toHaveCSS('opacity', '0');
    await expect(rail(page)).toHaveCSS('pointer-events', 'none');
  });

  test('stays inside the left gutter on a phone and adds no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    await jumpTo(page, 'how-it-works');
    await expect(rail(page)).toHaveCSS('opacity', '1');

    const box = await rail(page).boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(16); // content starts at 16px (px-4)

    const [scroll, client] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scroll).toBeLessThanOrEqual(client);
  });
});

test.describe('Landing page — small phone', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('has no horizontal overflow at 360px', async ({ page }) => {
    await page.goto('/');
    await page.locator('#join').waitFor();
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
    }
    const [scroll, client] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scroll).toBeLessThanOrEqual(client);
  });

  test('the driver email field and button are full width and tap-sized', async ({ page }) => {
    await page.goto('/#join');
    // Regression: `flex-1` inside a column flex container collapsed the input to ~20px tall.
    const input = page.getByLabel('Your email');
    const button = page.getByRole('button', { name: /get driver access/i });
    await expect(input).toBeVisible();

    const [inputBox, buttonBox] = await Promise.all([input.boundingBox(), button.boundingBox()]);
    expect(inputBox!.height).toBeGreaterThanOrEqual(44);
    expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(inputBox!.width - buttonBox!.width)).toBeLessThan(2);
  });

  test('the rider buttons say what they are: direct Android download, iPhone not ready', async ({ page }) => {
    await page.goto('/#join');
    await expect(page.getByRole('button', { name: /android \(apk\)/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /iphone \(ios\)/i })).toBeDisabled();
    await expect(page.getByText(/google play|app store/i)).toHaveCount(0);
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
