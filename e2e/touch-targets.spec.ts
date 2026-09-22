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
  ['enrollment-form', '/manager/enrollment-form'],
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
      // Radix mirrors Select and Switch into a visually hidden native control
      // for form submission. It is aria-hidden and 1px, never a tap target.
      if (el.closest('[aria-hidden="true"]')) continue;

      // A control's real target includes its label, whether the label wraps it
      // (<label><Checkbox/>Include</label>) or points at it
      // (<label for="rm-custom">). Radix radios use the second form, so the
      // 16px glyph is not what a finger has to find.
      const wrapping = el.closest('label');
      const pointing = el.id
        ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
        : null;
      const measured = wrapping ?? el;
      let box = measured.getBoundingClientRect();
      if (!wrapping && pointing) {
        const lb = pointing.getBoundingClientRect();
        // Only union when the label sits on the same row — a label parked
        // elsewhere on the page is not part of this control's target.
        const sameRow = lb.top < box.bottom && box.top < lb.bottom;
        if (sameRow) {
          const left = Math.min(box.left, lb.left);
          const top = Math.min(box.top, lb.top);
          box = new DOMRect(left, top, Math.max(box.right, lb.right) - left, Math.max(box.bottom, lb.bottom) - top);
        }
      }
      // Anything this small is a hidden proxy, not a control a finger aims at.
      // A genuinely undersized target is 16px+, well clear of this floor.
      if (box.width < 8 || box.height < 8) continue;

      // An absolutely-positioned ::after with negative insets is a hit-area
      // overlay (see switch.jsx): the control stays visually small while the
      // tappable region grows. getBoundingClientRect does not see it, so fold
      // it in or this would report a false failure.
      const after = getComputedStyle(measured, '::after');
      let width = box.width;
      let height = box.height;
      if (after.content !== 'none' && after.position === 'absolute') {
        const inset = (v: string) => (parseFloat(v) || 0);
        width -= inset(after.left) + inset(after.right);
        height -= inset(after.top) + inset(after.bottom);
      }
      const rect = new DOMRect(box.x, box.y, Math.max(box.width, width), Math.max(box.height, height));

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

/** Radix animates dialogs in with a scale transform; measuring mid-flight
 *  reports a 44px control as 43px. Wait for the entrance to finish. */
async function settle(page: Page) {
  // Not every "open a form" path is a dialog — the add-driver form is an
  // inline card — so this is a no-op when there is nothing animating.
  const dialog = page.locator('[role="dialog"]').last();
  if (await dialog.count() === 0) return;
  await dialog.evaluate((el) => Promise.all(
    el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)),
  ));
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

  // Radios and the private-driver switch only exist inside dialogs, so a
  // page-level sweep never reaches them. These open the dialogs first.
  test('create-vehicle dialog: route-mode radios are tappable', async ({ page }) => {
    await loginAsManager(page);
    await mockManagerBackend(page);
    await mockManagerPortalData(page);
    await page.goto('/manager/vehicles');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /add vehicle/i }).click();
    await expect(page.getByRole('radio', { name: /custom route/i })).toBeVisible();
    await settle(page);

    const { undersized, tooClose } = await touchIssues(page, MIN_TOUCH_PX, MIN_GAP_PX);
    expect(undersized, `create-vehicle dialog: controls under ${MIN_TOUCH_PX}px`).toEqual([]);
    expect(tooClose, `create-vehicle dialog: controls closer than ${MIN_GAP_PX}px`).toEqual([]);
  });

  test('add-driver form: the private-driver switch is tappable', async ({ page }) => {
    await loginAsManager(page);
    await mockManagerBackend(page);
    await mockManagerPortalData(page);
    await page.goto('/manager/accounts');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /add driver/i }).click();
    const switchControl = page.getByRole('switch').first();
    await expect(switchControl).toBeVisible();
    await settle(page);

    // The pill stays 20x36 by design; the ::after overlay is what a finger
    // hits. Assert the overlay exists rather than trusting the sweep alone.
    const hitArea = await switchControl.evaluate((el) => {
      const after = getComputedStyle(el, '::after');
      const box = el.getBoundingClientRect();
      const inset = (v) => (parseFloat(v) || 0);
      return {
        width: box.width - inset(after.left) - inset(after.right),
        height: box.height - inset(after.top) - inset(after.bottom),
      };
    });
    expect(hitArea.height, 'switch hit area height').toBeGreaterThanOrEqual(MIN_TOUCH_PX);
    expect(hitArea.width, 'switch hit area width').toBeGreaterThanOrEqual(MIN_TOUCH_PX);

    const { undersized } = await touchIssues(page, MIN_TOUCH_PX, MIN_GAP_PX);
    expect(undersized, `add-driver form: controls under ${MIN_TOUCH_PX}px`).toEqual([]);
  });

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
