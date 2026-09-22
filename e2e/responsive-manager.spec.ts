import { test, expect, Page } from '@playwright/test';
import { loginAsManager, mockManagerBackend, mockManagerPortalData } from './helpers';

/**
 * Enforces docs/redesign/04-VERIFICATION-CHECKLIST.md section E for the manager
 * portal: every page free of horizontal overflow at a phone width, in both
 * themes. That item was signed off at CP 6.3 without ever being checked, and
 * the portal did clip content at 375px.
 *
 * Measuring `document.documentElement.scrollWidth` is NOT enough here, and a
 * spec that only did that would pass on a visibly broken page. AppShell's
 * outer frame is `h-screen overflow-hidden`, so the document can never
 * overflow no matter what happens inside it, and src/index.css also sets
 * `overflow-x: hidden` on html/body/#root. Both of those clip rather than
 * scroll. So this asserts on:
 *
 *   1. `main`, the real horizontal scroll container (it is `overflow-y-auto`
 *      with `overflow-x` unset, which computes to `overflow-x: auto`), and
 *   2. a per-element sweep for anything sticking out past the viewport or
 *      clipped inside its own box.
 */

const VIEWPORT = { width: 375, height: 800 };

const ROUTES: ReadonlyArray<readonly [string, string]> = [
  ['dashboard', '/manager/dashboard'],
  ['vehicles', '/manager/vehicles'],
  ['tracking', '/manager/tracking'],
  ['drivers', '/manager/accounts'],
  ['enrollments', '/manager/requests'],
  ['enrollment-form', '/manager/enrollment-form'],
  ['settings', '/manager/settings'],
];

test.use({ viewport: VIEWPORT });

/**
 * Elements wider than the viewport, or clipped inside their own scroll box.
 *
 * Skipped deliberately: fixed-position chrome (toasts, banners), zero-size and
 * sr-only nodes, Radix popper portals (a dropdown is allowed to be positioned
 * off-canvas before it opens), and any element inside a container that opts
 * into horizontal scrolling — a table told to scroll sideways is doing its job.
 */
async function overflowOffenders(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders: string[] = [];

    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const style = getComputedStyle(el);
      if (style.position === 'fixed' || style.display === 'none' || style.visibility === 'hidden') continue;
      if (el.closest('[data-radix-popper-content-wrapper]')) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) continue;

      const describe = () => {
        const cls = typeof el.className === 'string' ? el.className.slice(0, 70) : '';
        return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}`;
      };

      if (rect.right > viewportWidth + 1) {
        offenders.push(`${describe()} extends to ${Math.round(rect.right)}px past a ${viewportWidth}px viewport`);
      }

      const scrollsHorizontally = style.overflowX === 'auto' || style.overflowX === 'scroll';
      // `truncate` (overflow-hidden + text-overflow: ellipsis) clips on
      // purpose and tells the reader it did, so it is not an overflow bug.
      const truncatesWithEllipsis = style.textOverflow === 'ellipsis';

      const clipped = el.scrollWidth - el.clientWidth;
      if (clipped > 1 && !scrollsHorizontally && !truncatesWithEllipsis) {
        offenders.push(`${describe()} clips ${clipped}px of its own content`);
      }
    }

    return offenders.slice(0, 12);
  });
}

for (const theme of ['light', 'dark'] as const) {
  for (const [name, path] of ROUTES) {
    test(`${name} has no horizontal overflow at 375x800 (${theme})`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // ColorMode reads this on boot and puts `.dark` on <html>, so the theme
      // is set without clicking through the topbar toggle.
      await page.addInitScript((mode) => {
        window.localStorage.setItem('webadmin-color-mode', mode);
      }, theme);

      await loginAsManager(page);
      await mockManagerBackend(page);
      // Registered second so its populated handlers win over the empty ones.
      await mockManagerPortalData(page);

      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const main = page.locator('main');
      await expect(main).toBeVisible();

      const mainOverflow = await main.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(mainOverflow, `${name} (${theme}): <main> scrolls ${mainOverflow}px sideways`)
        .toBeLessThanOrEqual(1);

      expect(await overflowOffenders(page), `${name} (${theme}): elements overflowing`).toEqual([]);

      // The sidebar is a Sheet below md, so the rail must not be taking space.
      await expect(page.getByRole('button', { name: /open navigation/i })).toBeVisible();

      await page.screenshot({ path: `.playwright-shots/${name}-${theme}-top.png` });
      await main.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await page.screenshot({ path: `.playwright-shots/${name}-${theme}-bottom.png` });

      expect(consoleErrors, `${name} (${theme}): console errors`).toEqual([]);
    });
  }
}

/**
 * The revealed enrollment key is the tightest row in the portal: an
 * 18-character key that must not break mid-token, plus a lock glyph and the
 * Copy and Hide buttons. Together they exceed the card width, so the row wraps
 * (ManagerAccountsPage.jsx, EnrollmentKeyCell). Show keys explicitly, because
 * they are hidden by default and the page-level test never reveals one.
 */
test('revealed enrollment keys do not overflow their card at 375x800', async ({ page }) => {
  await loginAsManager(page);
  await mockManagerBackend(page);
  await mockManagerPortalData(page);

  await page.goto('/manager/accounts');
  await page.waitForLoadState('networkidle');

  const showKeyButtons = page.getByRole('button', { name: /show key/i });
  const count = await showKeyButtons.count();
  expect(count, 'expected at least one driver with a hidden key').toBeGreaterThan(0);

  for (let i = 0; i < count; i += 1) {
    // Each reveal re-renders the list, so re-resolve the first still-hidden one.
    await page.getByRole('button', { name: /show key/i }).first().click();
  }

  await expect(page.getByText('TMD-AAAA-BBBB-CCCC').first()).toBeVisible();

  const mainOverflow = await page.locator('main').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(mainOverflow, 'revealed keys made <main> scroll sideways').toBeLessThanOrEqual(1);
  expect(await overflowOffenders(page), 'revealed keys overflow').toEqual([]);

  await page.screenshot({ path: '.playwright-shots/drivers-keys-revealed-375.png', fullPage: false });
});
