import { test, expect, Page } from '@playwright/test';
import { loginAsManager, mockManagerBackend, mockManagerPortalData } from './helpers';

/**
 * Enforces the 44px touch-target minimum (Apple HIG 44pt / Material 48dp) on
 * the manager portal.
 *
 * `isMobile` + `hasTouch` matter here: they make the browser report
 * `pointer: coarse`, which is what the `coarse:` Tailwind variant keys off
 * (tailwind.config.cjs). Without them this runs as a desktop pointer and the
 * touch sizing never applies — the assertions would pass against the wrong
 * rendering. The rest of the responsive suite deliberately stays on a desktop
 * pointer so it checks the mouse layout at a narrow width.
 */

const MIN_TOUCH_PX = 44;
const MIN_GAP_PX = 8;

test.use({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true });

const ROUTES: ReadonlyArray<readonly [string, string]> = [
  ['dashboard', '/manager/dashboard'],
  ['vehicles', '/manager/vehicles'],
  ['tracking', '/manager/tracking'],
  ['drivers', '/manager/accounts'],
  ['enrollments', '/manager/requests'],
  ['settings', '/manager/settings'],
];

/**
 * Controls smaller than the minimum, and controls closer together than the
 * minimum gap.
 *
 * Checkboxes, radios and switches are measured through their wrapping <label>
 * where there is one: the label is the real target (clicking its text toggles
 * the control), so the glyph's own 16px box is not what a finger has to hit.
 */
async function touchIssues(page: Page, minSize: number, minGap: number) {
  return page.evaluate(([min, gap]) => {
    const selector = [
      'button', 'a[href]', 'input:not([type="hidden"])', 'select', 'textarea',
      '[role="button"]', '[role="tab"]', '[role="checkbox"]', '[role="radio"]', '[role="switch"]',
    ].join(',');

    const targets: { label: string; rect: DOMRect }[] = [];
    for (const el of Array.from(document.querySelectorAll(selector)) as HTMLElement[]) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      // Measure the label when one wraps this control.
      const labelled = el.closest('label');
      const measured = labelled ?? el;
      const rect = measured.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;

      const name = (el.getAttribute('aria-label') || measured.textContent || el.tagName).trim();
      targets.push({ label: name.slice(0, 36) || el.tagName, rect });
    }

    const undersized = new Set<string>();
    for (const { label, rect } of targets) {
      if (rect.height < min || rect.width < min) {
        undersized.add(`${Math.round(rect.width)}x${Math.round(rect.height)} "${label}"`);
      }
    }

    const tooClose = new Set<string>();
    for (let i = 0; i < targets.length; i += 1) {
      for (let j = i + 1; j < targets.length; j += 1) {
        const a = targets[i].rect;
        const b = targets[j].rect;
        if (a === b) continue;
        const sameRow = a.top < b.bottom && b.top < a.bottom;
        const overlapping = a.left < b.right && b.left < a.right;
        if (!sameRow || overlapping) continue;
        const distance = b.left > a.right ? b.left - a.right : a.left - b.right;
        if (distance >= 0 && distance < gap) {
          tooClose.add(`${Math.round(distance)}px between "${targets[i].label}" and "${targets[j].label}"`);
        }
      }
    }

    return { undersized: [...undersized], tooClose: [...tooClose] };
  }, [minSize, minGap] as const);
}

test.describe('touch targets at 375x800', () => {
  test('the coarse-pointer variant is actually active', async ({ page }) => {
    await loginAsManager(page);
    await mockManagerBackend(page);
    await mockManagerPortalData(page);
    await page.goto('/manager/dashboard');

    // Guard against the whole suite silently testing the desktop rendering.
    const coarse = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
    expect(coarse, 'browser must report pointer: coarse for this suite to mean anything').toBe(true);
  });

  for (const [name, path] of ROUTES) {
    test(`${name}: every control is at least ${MIN_TOUCH_PX}px`, async ({ page }) => {
      await loginAsManager(page);
      await mockManagerBackend(page);
      await mockManagerPortalData(page);
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const { undersized, tooClose } = await touchIssues(page, MIN_TOUCH_PX, MIN_GAP_PX);

      expect(undersized, `${name}: controls under ${MIN_TOUCH_PX}px`).toEqual([]);
      expect(tooClose, `${name}: controls closer than ${MIN_GAP_PX}px`).toEqual([]);
    });
  }

  test('inputs are at least 16px so iOS does not zoom on focus', async ({ page }) => {
    await loginAsManager(page);
    await mockManagerBackend(page);
    await mockManagerPortalData(page);
    await page.goto('/manager/settings');
    await page.waitForLoadState('networkidle');

    const tooSmall = await page.evaluate(() => Array.from(
      document.querySelectorAll('input:not([type="hidden"]), select, textarea'),
    )
      .map((el) => ({ tag: el.tagName, size: parseFloat(getComputedStyle(el).fontSize) }))
      .filter((f) => f.size < 16)
      .map((f) => `${f.tag} at ${f.size}px`));

    expect(tooSmall, 'inputs under 16px make iOS Safari zoom the viewport').toEqual([]);
  });
});
