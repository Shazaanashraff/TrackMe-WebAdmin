import { test, expect, Page } from '@playwright/test';
import {
  loginAsManager,
  loginAsSuperAdmin,
  mockManagerBackend,
  mockManagerPortalData,
  mockSuperAdminDashboardBackend,
} from './helpers';

/**
 * The public landing page at `/`. Covers what unit tests cannot: the pinned
 * "How it works" film really pins and plays as the page scrolls (the phone swaps
 * sides, the screens animate, the phone becomes a laptop), nothing overflows on a
 * phone, and a signed-in user is still sent straight to their dashboard.
 */

// The page is a lazy chunk, so wait for the story to exist before measuring it.
// The opening plays once per session. Every spec but the ones about the opening itself starts
// as a returning visitor, so the loader never sits in front of what is being tested.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('trackme-intro-seen', '1'));
});

const storyState = async (page: Page) => {
  await page.locator('#how-it-works').waitFor();
  return page.evaluate(() => {
    const el = document.getElementById('how-it-works')!;
    return { step: el.dataset.step, side: el.dataset.side };
  });
};

// Keep in step with storyScreens() in chapterMath.js: the film is 6.5 screens on a wide screen, 4.8 below 1024px.
const storyScreens = (width: number) => (width < 1024 ? 4.8 : 6.5);
const CHAPTERS = 4;

// The story is one film, pinned for its screens (then the curtain). Its timeline runs 0..CHAPTERS, one unit
// per chapter; this scrolls to a moment on it, as an instant jump (the film's scrub then catches up).
async function playStoryTo(page: Page, time: number) {
  await page.locator('#how-it-works').waitFor();
  const top = await page.evaluate(
    () => document.getElementById('how-it-works')!.getBoundingClientRect().top + window.scrollY,
  );
  const { width, height } = page.viewportSize()!;
  const distance = (time / CHAPTERS) * height * storyScreens(width);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(top + distance));
}

// The middle of a chapter: its screen is playing and nothing is gliding.
async function scrollToStoryStep(page: Page, step: number) {
  await playStoryTo(page, step + 0.5);
  await expect.poll(async () => (await storyState(page)).step).toBe(String(step));
}

test.describe('Landing page — desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('renders every section with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText("Where's the shuttle?");
    await expect(page.locator('#what')).toBeAttached();
    await expect(page.locator('#how-it-works')).toBeAttached();
    await expect(page.locator('#join')).toBeAttached();
    await expect(page).toHaveTitle(/Pingo/);
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
      () => document.querySelector('#how-it-works [data-story-stage]')!.getBoundingClientRect().top,
    );
    expect(Math.abs(stageTop)).toBeLessThan(1); // pinned to the top, give or take a sub-pixel

    // The last step's copy is the manager one, and the portal shot is on screen.
    await expect(page.getByRole('heading', { name: /run the whole fleet/i })).toBeVisible();
  });

  const heroVideo = (page: Page) => page.locator('#top video');

  test('the hero plays the film clip: a muted, looping, inline video with its poster', async ({ page }) => {
    await page.goto('/');
    await heroVideo(page).waitFor({ state: 'attached' });

    await expect(heroVideo(page)).toHaveAttribute('poster', '/landing/hero-poster.webp');
    const flags = await heroVideo(page).evaluate((el: HTMLVideoElement) => ({
      muted: el.muted,
      loop: el.loop,
      autoplay: el.autoplay,
      inline: el.hasAttribute('playsinline'),
      controls: el.controls,
    }));
    expect(flags).toEqual({ muted: true, loop: true, autoplay: true, inline: true, controls: false });
    await expect(heroVideo(page).locator('source')).toHaveAttribute('src', '/landing/hero.mp4');
  });

  test('the clip is purely decorative: hidden from assistive tech and never steals a click', async ({ page }) => {
    await page.goto('/');
    await expect(heroVideo(page)).toHaveAttribute('aria-hidden', 'true');
    await page.getByRole('link', { name: /i'm a rider/i }).click();
    await expect(page).toHaveURL(/#join$/);
  });

  test('the HD clips and their pictures are really served: full HD wide, a portrait cut, and WebP stills', async ({ request }) => {
    const wide = await request.get('/landing/hero.mp4');
    expect(wide.ok()).toBe(true);
    expect(wide.headers()['content-type']).toMatch(/video\/mp4/);
    const wideSize = (await wide.body()).length;
    expect(wideSize).toBeGreaterThan(5_000_000); // an HD file, not a thumbnail of one

    const tall = await request.get('/landing/hero-tall.mp4');
    expect(tall.ok()).toBe(true);
    const tallSize = (await tall.body()).length;
    expect(tallSize).toBeGreaterThan(3_000_000);
    expect(tallSize).toBeLessThan(wideSize); // lighter for a phone's data

    for (const file of ['hero-poster', 'hero-still', 'hero-tall-poster', 'hero-tall-still']) {
      const image = await request.get(`/landing/${file}.webp`);
      expect(image.ok()).toBe(true);
      expect(image.headers()['content-type']).toMatch(/image\/webp/);
    }
  });

  test('the hero has no shuttle timer and no strapline: the headline and the two buttons say it all', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();

    await expect(page.locator('#top').getByText('to your stop')).toHaveCount(0);
    await expect(page.locator('#top').getByText(/live tracking for school/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /i'm a rider/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /i'm a driver/i })).toBeVisible();
  });

  test('the statement lights up word by word as it is scrolled into reading position', async ({ page }) => {
    await page.goto('/');
    const lastWord = page.locator('#what-heading span').last();
    await expect(lastWord).toBeAttached();
    const dim = Number(await lastWord.evaluate((el) => getComputedStyle(el).opacity));
    expect(dim).toBeLessThan(0.5);

    await page.evaluate(() => {
      const top = document.getElementById('what-heading')!.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - 80);
    });
    await expect
      .poll(async () => Number(await lastWord.evaluate((el) => getComputedStyle(el).opacity)))
      .toBeGreaterThan(0.95);
  });

  test('the nav marks the section you are in', async ({ page }) => {
    await page.goto('/');
    await page.locator('#how-it-works').waitFor();
    await page.evaluate(() => {
      const top = document.getElementById('how-it-works')!.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + 100);
    });
    const nav = page.getByRole('navigation', { name: 'Landing' });
    await expect(nav.getByRole('link', { name: 'How it works' })).toHaveAttribute('aria-current', 'location');
    // ...and one of the four ticks beside it is lit for the section.
    await expect(page.locator('[data-nav-pill] [data-tick="on"]')).toHaveCount(1);
  });

  test('has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    const [scroll, client] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scroll).toBeLessThanOrEqual(client);
  });

  test('the nav button and link scroll to their sections', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('link', { name: 'Get the app' }).click();
    await expect(page.getByRole('heading', { name: /rider or driver\?/i })).toBeInViewport();
  });

  test('the nav has no manager sign in; the footer does, and it goes to the login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link', { name: /sign in/i })).toHaveCount(0);
    await page.getByRole('contentinfo').getByRole('link', { name: /manager sign in/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the nav slides away on the way down and comes back on the way up', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    const header = page.getByRole('banner');
    const offscreen = () => header.evaluate((el) => el.getBoundingClientRect().bottom < 0);

    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    await expect.poll(offscreen, { timeout: 4000 }).toBe(true);
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
    await expect.poll(offscreen, { timeout: 4000 }).toBe(false);
  });

  test('a thin line along the bottom of the nav fills as the page scrolls', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-nav-progress]').waitFor({ state: 'attached' });
    const fill = () => page.locator('[data-nav-progress]').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);

    expect(await fill()).toBeLessThan(0.02);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight / 2, behavior: 'instant' }));
    await expect.poll(fill, { timeout: 4000 }).toBeGreaterThan(0.4);
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

test.describe('Landing page — reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the hero shows the still poster, with no video at all', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#top h1').waitFor();

    await expect(page.locator('#top video')).toHaveCount(0);
    await expect(page.locator('#top [data-scene] img')).toHaveAttribute('src', '/landing/hero-still.webp');
  });
});

test.describe('Landing page — phone', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('pins the story and has no horizontal overflow', async ({ page }) => {
    await page.goto('/');

    // The same pinned film as a desktop, in its compact layout: the section carries the step state.
    await page.locator('#how-it-works [data-story-stage]').waitFor();
    expect((await storyState(page)).step).toBe('0');

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
    await expect(page.getByRole('heading', { level: 3, name: /run the whole fleet/i })).toBeAttached();
  });
});

test.describe('Landing page — no track bar down the side', () => {
  // A fixed strip hugging the left edge (the old route line) would show up here.
  const sideStrips = (page: Page) =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('body *')).filter((el) => {
        const style = getComputedStyle(el);
        if (style.position !== 'fixed') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.width <= 40 && r.height >= 200 && r.left < 40;
      }).length,
    );

  test('nothing is fixed to the side of the screen on a desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.locator('#join').waitFor();
    for (const y of [0, 1200, 4000, 9000]) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(150);
      expect(await sideStrips(page)).toBe(0);
    }
    await expect(page.locator('[data-progress]')).toHaveCount(0);
    await expect(page.locator('[data-stop-counter]')).toHaveCount(0);
  });

  test('nor on a phone, where it also leaves the whole left gutter to the content', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    await page.locator('#join').waitFor();
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
    await page.waitForTimeout(200);

    expect(await sideStrips(page)).toBe(0);
    await expect(page.locator('[data-progress]')).toHaveCount(0);
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

  test('the rider badges are honest: Android and iPhone both say "Coming soon" until a release exists', async ({ page }) => {
    await page.goto('/#join');
    await expect(page.getByRole('button', { name: /android/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /iphone/i })).toBeDisabled();
    await expect(page.getByText(/coming soon/i)).toHaveCount(2);
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

test.describe('Landing page — the opening', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Registered after the file-level beforeEach, so this removes the flag it set.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.sessionStorage.removeItem('trackme-intro-seen'));
  });

  const loader = (page: Page) => page.getByRole('status', { name: /loading pingo/i });

  test('plays on a first visit: the counter runs, scrolling is locked, then the page opens', async ({ page }) => {
    await page.goto('/');
    await expect(loader(page)).toBeVisible();

    // Locked: a wheel turn during the opening does not move the page.
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    // The counter really counts.
    const counter = loader(page).locator('p.font-mono').first();
    const early = await counter.textContent();
    await page.waitForTimeout(900);
    expect(Number(await counter.textContent())).toBeGreaterThan(Number(early));

    // ...and the opening ends by itself, well inside its ceiling.
    await expect(loader(page)).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator('.landing')).toHaveAttribute('data-intro', 'done');
    expect(await page.evaluate(() => window.sessionStorage.getItem('trackme-intro-seen'))).toBe('1');
  });

  test("holds the hero's own entrance until the page has opened", async ({ page }) => {
    await page.goto('/');
    await expect(loader(page)).toBeVisible();
    const playState = () =>
      page.locator('#top h1 .l-word > span').first().evaluate((el) => getComputedStyle(el).animationPlayState);

    // While the loader plays, the headline words are still parked below their masks.
    expect(await playState()).toBe('paused');
    await expect(loader(page)).toHaveCount(0, { timeout: 5000 });
    await expect.poll(playState).toBe('running');
  });

  test('is skipped entirely for visitors who prefer reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    await expect(loader(page)).toHaveCount(0);
    await expect(page.locator('.landing')).toHaveAttribute('data-intro', 'done');
  });
});

test.describe('Landing page — smooth scrolling', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

  test('a wheel turn glides: the page is still travelling a moment later, then settles', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    await page.waitForTimeout(500);
    await expect(page.locator('html')).toHaveClass(/lenis/);

    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(90);
    const early = await scrollY(page);
    await page.waitForTimeout(1600);
    const settled = await scrollY(page);

    expect(settled).toBeGreaterThan(450); // it went most of the way
    expect(early).toBeLessThan(settled * 0.85); // and was not already there after 90ms
    // Still settled: it does not drift on after coming to rest.
    await page.waitForTimeout(300);
    expect(Math.abs((await scrollY(page)) - settled)).toBeLessThan(3);
  });

  test('a nav link glides to its section and lands on it', async ({ page }) => {
    await page.goto('/');
    await page.locator('#join').waitFor();
    await page.waitForTimeout(500);

    await page.getByRole('banner').getByRole('link', { name: 'Get the app' }).click();
    await page.waitForTimeout(150);
    const early = await scrollY(page);
    await page.waitForTimeout(2600);

    const top = await page.evaluate(() => Math.round(document.getElementById('join')!.getBoundingClientRect().top));
    expect(Math.abs(top)).toBeLessThan(4); // landed exactly on the section
    expect(early).toBeLessThan(await scrollY(page)); // and did not teleport there
    expect(await page.evaluate(() => window.location.hash)).toBe('#join');
  });

  test('the whole page can be scrolled, down to the very bottom, despite the pinned hero', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    await page.waitForTimeout(600);
    await page.mouse.move(720, 450);

    // Lenis once believed the page was ~2000px shorter than it is (it measured before the hero's
    // pin added its distance), so it stopped there. Wheel all the way and check we reach the end.
    for (let i = 0; i < 16; i += 1) {
      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(220);
    }
    await page.waitForTimeout(1500);

    const gap = await page.evaluate(
      () => document.documentElement.scrollHeight - (window.scrollY + window.innerHeight),
    );
    expect(gap).toBeLessThan(4);
  });

  test("uses the browser's own scrolling when reduced motion is preferred", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#top h1').waitFor();

    await expect(page.locator('html')).not.toHaveClass(/lenis/);
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(400);
    expect(await scrollY(page)).toBeGreaterThan(600);
  });
});

test.describe('Landing page — the hero film', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Keep in step with HERO_SCREENS in roadScene.js: a phone gets a shorter film. After the film the
  // stage stays pinned for the curtain (1 screen, 0.8 on a phone) while the next section slides over it.
  const screensFor = (page: Page) => (page.viewportSize()!.width < 768 ? 3.6 : 4.6);
  const curtainFor = (page: Page) => (page.viewportSize()!.width < 768 ? 0.8 : 1);

  const stage = (page: Page) => page.locator('#top [data-hero-state]');
  const variable = async (page: Page, name: string) =>
    parseFloat(await stage(page).evaluate((el, n) => el.style.getPropertyValue(n), name));
  const opacityOf = (page: Page, selector: string) =>
    page.locator(selector).evaluate((el) => Number(getComputedStyle(el).opacity));
  const jumpTo = async (page: Page, fraction: number) => {
    const distance = Math.round((page.viewportSize()!.height) * screensFor(page) * fraction);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), distance);
  };

  test('at rest it is only the nav, the frame and the word PINGO: no words and no buttons yet', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    await expect.poll(() => variable(page, '--dy'), { timeout: 8000 }).toBeGreaterThan(-0.5); // the word has landed

    expect(await stage(page).getAttribute('data-hero-state')).toBe('scrubbed');
    expect(await opacityOf(page, '#top [data-q]')).toBe(0);
    expect(await opacityOf(page, '#top [data-cta]')).toBe(0);
    expect(await opacityOf(page, '#top [data-a]')).toBe(0);
    await expect(page.locator('[data-nav-pill]')).toBeVisible();
    // The film shows only through the word: the window carries a mask drawn in code.
    const mask = await page.locator('#top [data-window]').evaluate((el) => getComputedStyle(el).maskImage);
    expect(mask).toMatch(/svg/);
    // The buttons stay in the page for keyboard and screen-reader users.
    await expect(page.getByRole('link', { name: /i'm a rider/i })).toBeAttached();
  });

  test('the word drops in from the top slowly and smoothly: no bounce, never going back up', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    const samples: number[] = [];
    for (let i = 0; i < 14; i += 1) {
      samples.push(await variable(page, '--dy'));
      await page.waitForTimeout(330);
    }

    expect(samples[0]).toBeLessThan(-30); // above the middle of the screen at first
    expect(samples.at(-1)).toBeGreaterThan(-0.5); // and in the middle by the end
    samples.slice(1).forEach((value, i) => expect(value).toBeGreaterThanOrEqual(samples[i] - 0.01)); // never rises again
    expect(samples.filter((v) => v < -1).length).toBeGreaterThan(5); // it took a good while (seconds, not a flick)
  });

  test('is pinned while it plays, then lets go', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    const top = () => stage(page).evaluate((el) => Math.round(el.getBoundingClientRect().top));

    await jumpTo(page, 0.5);
    await expect.poll(top).toBe(0); // held on screen mid-film

    await jumpTo(page, 1 + (curtainFor(page) + 0.5) / screensFor(page)); // past the film AND the curtain
    await expect.poll(top).toBeLessThan(-50); // released: it has scrolled away
  });

  test('plays as you scroll: the word grows, a circle of film opens, then the words arrive', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    await expect.poll(() => variable(page, '--dy'), { timeout: 8000 }).toBeGreaterThan(-0.5); // let the page settle: the word has landed
    expect(await variable(page, '--ws')).toBe(1);
    expect(await variable(page, '--wc')).toBe(0);

    await jumpTo(page, 0.2);
    await expect.poll(() => variable(page, '--ws'), { timeout: 6000 }).toBeGreaterThan(1.05); // the letters are growing
    await expect.poll(() => variable(page, '--wc'), { timeout: 6000 }).toBeGreaterThan(20); // the circle has begun
    expect(await opacityOf(page, '#top [data-q]')).toBeLessThan(0.05); // no words yet

    await jumpTo(page, 0.82);
    await expect.poll(() => opacityOf(page, '#top [data-q]'), { timeout: 6000 }).toBeGreaterThan(0.9);
    await expect.poll(() => opacityOf(page, '#top [data-cta]'), { timeout: 6000 }).toBeGreaterThan(0.9);

    await jumpTo(page, 1);
    await expect.poll(() => opacityOf(page, '#top [data-a]'), { timeout: 6000 }).toBeGreaterThan(0.95);
    await expect.poll(() => opacityOf(page, '#top [data-q]'), { timeout: 6000 }).toBeLessThan(0.05); // the question has lifted away
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Right');
  });

  test('ends with a circle of film that covers the whole screen', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();

    await jumpTo(page, 1);
    const { w, h } = { w: 1440, h: 900 };
    await expect.poll(() => variable(page, '--wc'), { timeout: 6000 }).toBeGreaterThan(Math.hypot(w, h) * 0.55);
  });

  test('the nav mark has no turning ring of text around it', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-nav-pill]').waitFor();
    await expect(page.locator('header textPath')).toHaveCount(0);
    await expect(page.locator('header svg g')).toHaveCount(0);
  });

  test('is a calm finished frame for visitors who prefer reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#top h1').waitFor();

    expect(await stage(page).getAttribute('data-hero-state')).toBe('static');
    expect(await page.locator('#top [data-window]').evaluate((el) => getComputedStyle(el).maskImage)).toBe('none');
    expect(await opacityOf(page, '#top [data-a]')).toBe(1);
    expect(await opacityOf(page, '#top [data-cta]')).toBe(1);
    expect(await page.locator('.pin-spacer').count()).toBe(0); // nothing is pinned
    await expect(page.getByRole('link', { name: /i'm a rider/i })).toBeVisible();
  });

  test('works on a phone: the word on one line across the screen, then opening to fill it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    await expect.poll(() => variable(page, '--dy'), { timeout: 8000 }).toBeGreaterThan(-0.5);

    const size = await page.locator('#top [data-window]').evaluate((el) => {
      const [w, h] = getComputedStyle(el).maskSize.split(',')[0].trim().split(' ').map(parseFloat);
      return { w, h };
    });
    expect(size.w).toBeGreaterThan(390 * 0.85); // nearly the whole width...
    expect(size.w).toBeLessThanOrEqual(390 - 8); // ...but inside the screen
    expect(size.w / size.h).toBeGreaterThan(4); // one line, not PIN over GO

    await jumpTo(page, 1);
    await expect.poll(() => variable(page, '--wc'), { timeout: 6000 }).toBeGreaterThan(Math.hypot(390, 844) * 0.5);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Right');

    const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(scroll).toBeLessThanOrEqual(client);
  });
});

test.describe('Landing page — the story film', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const phone = (page: Page) => page.locator('#how-it-works [data-phone]');
  const laptop = (page: Page) => page.locator('#how-it-works [data-laptop]');
  const text = (page: Page, selector: string) => page.locator('#how-it-works ' + selector).first().textContent();
  const opacityOf = (page: Page, selector: string) =>
    page.locator('#how-it-works ' + selector).first().evaluate((el) => Number(getComputedStyle(el).opacity));
  const centreX = async (page: Page, selector: string) => {
    const box = await page.locator('#how-it-works ' + selector).first().boundingBox();
    return box!.x + box!.width / 2;
  };
  const marker = (page: Page) => page.locator('#how-it-works [data-marker]').getAttribute('transform');

  // Copy that is on show, by chapter: every block is in the page, only one is visible.
  const visibleCopy = (page: Page) =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('#how-it-works [data-copy]'))
        .map((el, i) => ({ i, opacity: Number(getComputedStyle(el).opacity) }))
        .filter((c) => c.opacity > 0.9)
        .map((c) => c.i),
    );

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#how-it-works [data-story-stage]').waitFor();
    await page.waitForTimeout(500);
  });

  test('is a pinned film: the stage holds still while the chapters play through', async ({ page }) => {
    const stageTop = () => page.locator('#how-it-works [data-story-stage]').evaluate((el) => el.getBoundingClientRect().top);

    for (const time of [0.3, 1.5, 2.5, 3.7]) {
      await playStoryTo(page, time);
      await expect.poll(async () => Math.abs(await stageTop())).toBeLessThan(1);
    }

    await playStoryTo(page, CHAPTERS + 0.9); // beyond the end AND the curtain: it lets go and the page moves on
    await expect.poll(stageTop).toBeLessThan(-50);
  });

  test('shows one chapter\'s copy at a time, in order, with a progress bar for each', async ({ page }) => {
    await expect(page.locator('#how-it-works [data-seg]')).toHaveCount(CHAPTERS);

    for (const chapter of [0, 1, 2, 3]) {
      await playStoryTo(page, chapter + 0.5);
      await expect.poll(() => visibleCopy(page), { timeout: 6000 }).toEqual([chapter]);
    }
  });

  test('starts with the map phone on the left and the first chapter\'s title on the right', async ({ page }) => {
    await playStoryTo(page, 0.3);

    await expect(page.getByRole('heading', { level: 3, name: 'See it coming.' })).toBeVisible();
    expect(await centreX(page, '[data-phone]')).toBeLessThan(720);
    expect(await centreX(page, '[data-copy]')).toBeGreaterThan(720);
  });

  test('glides the device to the other side at each boundary, and back', async ({ page }) => {
    const sides: string[] = [];
    for (const chapter of [0, 1, 2]) {
      await playStoryTo(page, chapter + 0.5);
      await expect.poll(async () => (await storyState(page)).step).toBe(String(chapter));
      await page.waitForTimeout(1200); // let the scrub catch up
      sides.push((await centreX(page, '[data-device]')) < 720 ? 'left' : 'right');
    }
    expect(sides).toEqual(['left', 'right', 'left']);
  });

  test('the shuttle drives its route as you scroll: the marker moves and the countdown falls', async ({ page }) => {
    await playStoryTo(page, 0.14);
    await expect.poll(() => text(page, '[data-eta]'), { timeout: 6000 }).toBe('4 min');
    await page.waitForTimeout(800);
    const start = await marker(page);

    await playStoryTo(page, 0.6);
    await expect.poll(() => marker(page), { timeout: 6000 }).not.toBe(start);
    await expect.poll(() => text(page, '[data-eta]'), { timeout: 6000 }).toMatch(/^[123] min$/);

    await playStoryTo(page, 0.9); // the content has finished: the shuttle has arrived
    await expect.poll(() => text(page, '[data-eta]'), { timeout: 6000 }).toBe('Here');
    await expect.poll(() => text(page, '[data-away]')).toBe('At your stop');
  });

  test('types the driver key, sends the request, and waits for approval', async ({ page }) => {
    const typed = async () =>
      (await page.locator('#how-it-works [data-key-char]').allTextContents()).join('').replace(/ /g, '');

    await playStoryTo(page, 1.5);
    await expect.poll(typed, { timeout: 6000 }).toBe('TM4F7K'); // the whole key is in...
    expect(await text(page, '[data-status-title]')).toBe('Not sent yet'); // ...but not sent yet

    await playStoryTo(page, 1.9);
    await expect.poll(() => text(page, '[data-status-title]'), { timeout: 6000 }).toBe('Waiting for approval');
    expect(await text(page, '[data-button-label]')).toBe('Request sent');
  });

  test('the second rider\'s shuttle closes in as the riders chapter plays', async ({ page }) => {
    await playStoryTo(page, 2.14);
    await expect.poll(() => text(page, '[data-profile-eta]'), { timeout: 6000 }).toBe('6 min');

    await playStoryTo(page, 2.9);
    await expect.poll(() => text(page, '[data-profile-eta]'), { timeout: 6000 }).toBe('2 min');
  });

  test('the phone becomes a laptop for the manager chapter, which ends on an approval', async ({ page }) => {
    await playStoryTo(page, 2.5);
    await expect.poll(() => phone(page).evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 6000 }).toBeGreaterThan(0.95);
    expect(await laptop(page).evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.05);

    await playStoryTo(page, 3.5);
    await expect.poll(() => laptop(page).evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 6000 }).toBeGreaterThan(0.95);
    expect(await phone(page).evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.05);
    await expect(page.getByRole('heading', { level: 3, name: 'Run the whole fleet.' })).toBeVisible();

    await playStoryTo(page, 3.9);
    await expect.poll(() => opacityOf(page, '[data-toast]'), { timeout: 6000 }).toBeGreaterThan(0.9);
    await expect(page.locator('#how-it-works [data-toast]')).toContainText('Join request approved');
  });

  test('plays backwards: scrolling back up restores each chapter', async ({ page }) => {
    await playStoryTo(page, 3.7);
    await expect.poll(() => visibleCopy(page), { timeout: 6000 }).toEqual([3]);

    await playStoryTo(page, 0.14);
    await expect.poll(() => visibleCopy(page), { timeout: 6000 }).toEqual([0]);
    await expect.poll(() => text(page, '[data-eta]'), { timeout: 6000 }).toBe('4 min');
    expect(await opacityOf(page, '[data-phone]')).toBeGreaterThan(0.95);
    await expect.poll(() => centreX(page, '[data-device]'), { timeout: 6000 }).toBeLessThan(720);
  });

  test('keeps the device whole inside the stage on a short laptop screen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.locator('#how-it-works [data-story-stage]').waitFor();
    await page.waitForTimeout(500);
    await playStoryTo(page, 0.5);
    await page.waitForTimeout(1200);

    const box = (await phone(page).boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(70); // below the nav
    expect(box.y + box.height).toBeLessThanOrEqual(720 - 40); // clear of the progress bars
  });

  test('keeps the laptop inside its half of a small desktop window', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await page.locator('#how-it-works [data-story-stage]').waitFor();
    await page.waitForTimeout(500);
    await playStoryTo(page, 3.5);
    await page.waitForTimeout(1500);

    const box = (await laptop(page).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(512 - 8);
    expect(box.x + box.width).toBeLessThanOrEqual(1024);
  });
});

test.describe('Landing page — the story, without the film', () => {
  test('wide screens that prefer reduced motion get plain alternating chapters, no pin', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#how-it-works').waitFor();

    expect(await storyState(page)).toEqual({ step: undefined, side: undefined });
    await expect(page.locator('#how-it-works [data-story-stage]')).toHaveCount(0);
    await expect(page.locator('#how-it-works .pin-spacer')).toHaveCount(0);
    for (const title of ['See it coming.', 'Join with a key.', 'One login, every rider.', 'Run the whole fleet.']) {
      await expect(page.getByRole('heading', { level: 3, name: title })).toBeAttached();
    }

    // Chapters sit in two columns, the device alternating sides as it does in the film.
    const first = await page.getByRole('heading', { level: 3, name: 'See it coming.' }).boundingBox();
    const second = await page.getByRole('heading', { level: 3, name: 'Join with a key.' }).boundingBox();
    expect(first!.x).toBeGreaterThan(720); // copy on the right: the phone is on the left
    expect(second!.x).toBeLessThan(720);
  });

  test('a phone for reduced motion gets the plain stacked chapters, no pin, and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#how-it-works').waitFor();

    await expect(page.locator('#how-it-works [data-story-stage]')).toHaveCount(0);
    expect(await storyState(page)).toEqual({ step: undefined, side: undefined });
    const [scroll, client] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scroll).toBeLessThanOrEqual(client);
  });
});

test.describe('Landing page — the look', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const channel = (page: Page, name: string) =>
    page.locator('.landing').evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);

  test('uses the palette drawn from the film: deep blue-green ink, sunlit paper, sky blue, mint', async ({ page }) => {
    await page.goto('/');
    await page.locator('.landing').waitFor();

    expect(await channel(page, '--l-ink')).toBe('#08161f');
    expect(await channel(page, '--l-bone')).toBe('#f3f0e5');
    expect(await channel(page, '--l-sky')).toBe('#1d56b0');
    expect(await channel(page, '--l-teal')).toBe('#5eead4');
  });

  test('hangs a tab over each seam, drawn in the colour of the section above, in the section below', async ({ page }) => {
    await page.goto('/');
    await page.locator('#join').waitFor();

    const tabs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-tab]')).map((el) => {
        const section = el.closest('section, footer')!;
        const tab = el.getBoundingClientRect();
        const box = section.getBoundingClientRect();
        return {
          tone: el.getAttribute('data-tab'),
          section: section.id || section.tagName.toLowerCase(),
          color: getComputedStyle(el).color,
          flush: Math.round(tab.top - box.top),
          depth: Math.round(tab.height),
        };
      }),
    );

    expect(tabs.map((t) => [t.tone, t.section])).toEqual([['ink', 'what'], ['bone', 'how-it-works'], ['ink', 'join'], ['bone', 'footer']]);
    expect(tabs.map((t) => t.color)).toEqual(['rgb(8, 22, 31)', 'rgb(243, 240, 229)', 'rgb(8, 22, 31)', 'rgb(243, 240, 229)']);
    tabs.forEach((t) => {
      expect(t.flush).toBe(0); // starts exactly at the section's top edge
      expect(t.depth).toBeGreaterThanOrEqual(20); // a visible step, not a hairline
    });
  });

  test('is a tab in the middle only: flat out to both edges, stepping down between 14% and 86%', async ({ page }) => {
    await page.goto('/');
    await page.locator('#what').waitFor();

    const span = await page.locator('#what [data-tab] > div').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [r.left / innerWidth, r.right / innerWidth];
    });
    expect(span[0]).toBeCloseTo(0.14, 1);
    expect(span[1]).toBeCloseTo(0.86, 1);
  });

  test('draws the navigation as a small floating glass pill, centred, not a bar across the page', async ({ page }) => {
    await page.goto('/');
    const pill = page.locator('[data-nav-pill]');
    await pill.waitFor();

    const box = (await pill.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(38 * 16 + 1);
    expect(box.width).toBeLessThan(1440 - 100);
    expect(box.y).toBeGreaterThanOrEqual(8);
    expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(2);
    expect(await pill.evaluate((el) => getComputedStyle(el).backdropFilter)).toMatch(/blur/);
    expect(await pill.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius))).toBeGreaterThanOrEqual(12);
  });

  test('keeps the pill readable over the paper section: it darkens once the page has scrolled', async ({ page }) => {
    await page.goto('/');
    const pill = page.locator('[data-nav-pill]');
    await pill.waitFor();
    const alpha = () => pill.evaluate((el) => {
      const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)!;
      return Number(m[3] ?? 1);
    });
    const before = await alpha();

    await page.evaluate(() => window.scrollTo({ top: document.getElementById('what')!.getBoundingClientRect().top + window.scrollY + 300, behavior: 'instant' }));

    await expect(pill).toHaveAttribute('data-scrolled', 'true');
    await expect.poll(alpha).toBeGreaterThan(before);
  });
});

test.describe('Landing page — the cursor', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const ring = (page: Page) => page.locator('[data-cursor-ring]');

  test('a ring trails the mouse and swells over anything you can press', async ({ page }) => {
    await page.goto('/');
    await ring(page).waitFor({ state: 'attached' });
    await expect(ring(page)).toHaveAttribute('data-visible', 'false'); // not before the mouse has moved

    await page.mouse.move(700, 300);
    await expect(ring(page)).toHaveAttribute('data-visible', 'true');
    await expect.poll(async () => {
      const b = (await ring(page).boundingBox())!;
      return Math.hypot(b.x + b.width / 2 - 700, b.y + b.height / 2 - 300);
    }).toBeLessThan(6);
    const resting = (await ring(page).boundingBox())!.width;

    const rider = (await page.getByRole('link', { name: /i'm a rider/i }).boundingBox())!;
    await page.mouse.move(rider.x + rider.width / 2, rider.y + rider.height / 2);
    await expect(ring(page)).toHaveAttribute('data-active', 'true');
    await expect.poll(async () => (await ring(page).boundingBox())!.width).toBeGreaterThan(resting + 15);
  });

  test('never takes a click or hides the real cursor', async ({ page }) => {
    await page.goto('/');
    await ring(page).waitFor({ state: 'attached' });
    await expect(ring(page).locator('xpath=..')).toHaveCSS('pointer-events', 'none');
    expect(await page.locator('body').evaluate((el) => getComputedStyle(el).cursor)).not.toBe('none');
  });

  test('is not drawn for visitors who prefer reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    await expect(ring(page)).toHaveCount(0);
  });
});

test.describe('Landing page — the cursor on a touch screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('is not drawn at all: a finger has no cursor to follow', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    await expect(page.locator('[data-cursor-ring]')).toHaveCount(0);
    await expect(page.locator('[data-cursor-dot]')).toHaveCount(0);
  });
});

test.describe('Landing page — the join section and the finale', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const radius = (page: Page, selector: string) =>
    page.locator(selector).evaluate((el) => parseFloat((el as HTMLElement).style.getPropertyValue('--r')));
  const scrollSoTopIsAt = (page: Page, selector: string, fraction: number) =>
    page.evaluate(([sel, f]) => {
      const el = document.querySelector(sel as string)!;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top - innerHeight * (f as number), behavior: 'instant' });
    }, [selector, fraction]);

  test('the two halves are plain, with a big readable 01 and 02, and no circle wipe', async ({ page }) => {
    await page.goto('/#join');
    await page.waitForTimeout(1500);

    await expect(page.locator('#join [data-wipe]')).toHaveCount(0);
    const numerals = page.locator('#join [data-panel] > span[aria-hidden="true"]');
    await expect(numerals).toHaveCount(2);
    for (const [index, text] of ['01', '02'].entries()) {
      await expect(numerals.nth(index)).toHaveText(text);
      const style = await numerals.nth(index).evaluate((el) => {
        const cs = getComputedStyle(el);
        return { color: cs.color, stroke: cs.webkitTextStrokeWidth, size: parseFloat(cs.fontSize) };
      });
      expect(style.color).toBe('rgb(29, 86, 176)'); // solid sky blue, not a faint outline
      expect(parseFloat(style.stroke)).toBe(0);
      expect(style.size).toBeGreaterThanOrEqual(64);
    }
  });

  test('both halves are fully visible once the section is read, never left half hidden', async ({ page }) => {
    await page.goto('/#join');
    await page.waitForTimeout(1500);
    await scrollSoTopIsAt(page, '#join [data-panel]', 0.1);
    await expect(page.getByRole('heading', { level: 3, name: /i'm a rider/i })).toBeInViewport();
    await expect(page.getByRole('heading', { level: 3, name: /i'm a driver/i })).toBeInViewport();
    for (const panel of await page.locator('#join [data-panel]').all()) {
      expect(await panel.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.99);
    }
  });

  test('hovering does not change any colour: the points, the badges and the button stay as they are', async ({ page }) => {
    await page.goto('/#join');
    await page.waitForTimeout(1500);
    const submit = page.getByRole('button', { name: /get driver access/i });
    const before = await submit.evaluate((el) => getComputedStyle(el).backgroundColor);
    await submit.hover();
    await page.waitForTimeout(500);
    expect(await submit.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(before);
  });

  test('the footer opens its circle of sky and fills the wordmark, finished at the very bottom', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer [data-wipe]').waitFor();
    await page.waitForTimeout(500);

    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight - innerHeight - 1000, behavior: 'instant' }));
    await expect.poll(() => radius(page, 'footer [data-wipe]'), { timeout: 5000 }).toBeLessThan(100);

    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await expect.poll(() => radius(page, 'footer [data-wipe]'), { timeout: 6000 }).toBeGreaterThanOrEqual(149);
    await expect
      .poll(() => page.locator('footer [data-fill]').evaluate((el) => (el as HTMLElement).style.clipPath), { timeout: 6000 })
      .toMatch(/^inset\(-?[\d.]+(px|%)? 0(px|%)?( -?[\d.]+(px|%)?)?( 0(px|%)?)?\)$/); // fully open: no inset from the sides (the browser may shorten the four values)

    const sky = await page.locator('footer [data-wipe]').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(sky).toBe('rgb(29, 86, 176)');
  });

  test('for reduced motion the footer is simply finished: sky and a filled wordmark', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('footer').waitFor();

    const wipe = page.locator('footer [data-wipe]');
    expect(await wipe.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--r'))).toBe('');
    expect(await wipe.evaluate((el) => getComputedStyle(el).clipPath)).toMatch(/circle/);
    await expect(page.locator('footer [data-fill]')).toBeAttached();
    expect(await page.locator('footer [data-fill]').evaluate((el) => (el as HTMLElement).style.clipPath)).toBe('');
  });
});

test.describe('Landing page — a phone, as a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('has a shorter hero film than a desktop: 3.6 screens of scroll instead of 4.6', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    await page.waitForTimeout(600);

    // One screen for the stage, 3.6 for the film and 0.8 for the curtain.
    const spacer = await page.locator('#top .pin-spacer').evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(Math.abs(spacer - 844 * (1 + 3.6 + 0.8))).toBeLessThanOrEqual(4);
  });

  test('leaves the clip where it is behind the word: sliding it would show its edge through the letters', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    await page.waitForTimeout(600);
    const offset = () => page.locator('#top [data-scene]').evaluate((el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return [Math.round(m.e), Math.round(m.f)];
    });

    expect(await offset()).toEqual([0, 0]);
  });

  test('plays the portrait cut, not the wide one, with its own poster', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#top video source')).toHaveAttribute('src', '/landing/hero-tall.mp4');
    await expect(page.locator('#top video')).toHaveAttribute('poster', '/landing/hero-tall-poster.webp');
  });

  test('a phone on its side plays the wide HD cut again', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');
    await expect(page.locator('#top video source')).toHaveAttribute('src', '/landing/hero.mp4');
  });

  test('pins the story and plays it as you scroll: the device above its copy, swaying between chapters', async ({ page }) => {
    await page.goto('/');
    await page.locator('#how-it-works [data-story-stage]').waitFor();
    await page.waitForTimeout(500);
    const stageTop = () => page.locator('#how-it-works [data-story-stage]').evaluate((el) => Math.abs(Math.round(el.getBoundingClientRect().top)));
    const visibleCopy = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('#how-it-works [data-copy]'))
          .map((el, i) => ({ i, opacity: Number(getComputedStyle(el).opacity) }))
          .filter((c) => c.opacity > 0.9)
          .map((c) => c.i),
      );
    const deviceX = async () => {
      const box = (await page.locator('#how-it-works [data-device]').boundingBox())!;
      return Math.round(box.x + box.width / 2);
    };

    for (const chapter of [0, 1, 2, 3]) {
      await playStoryTo(page, chapter + 0.5);
      await expect.poll(stageTop, { timeout: 6000 }).toBe(0); // held on screen
      await expect.poll(visibleCopy, { timeout: 6000 }).toEqual([chapter]);
    }

    // The device is centred above its copy and sways a little (the laptop ends dead centre).
    await playStoryTo(page, 0.5);
    await page.waitForTimeout(1200);
    const phoneBox = (await page.locator('#how-it-works [data-phone]').boundingBox())!;
    const copyBox = (await page.locator('#how-it-works [data-copy]').first().boundingBox())!;
    expect(phoneBox.y + phoneBox.height).toBeLessThanOrEqual(copyBox.y + 24); // the copy sits below the device
    expect(Math.abs((await deviceX()) - 195)).toBeLessThanOrEqual(80); // within a sway of the middle

    await playStoryTo(page, 3.5);
    await expect.poll(async () => Math.abs((await deviceX()) - 195), { timeout: 6000 }).toBeLessThanOrEqual(2);
  });

  test('never squeezes the phone: it keeps its proportions and sits inside the screen', async ({ page }) => {
    await page.goto('/');
    await page.locator('#how-it-works [data-story-stage]').waitFor();
    await playStoryTo(page, 0.5);
    await page.waitForTimeout(1200);

    const box = (await page.locator('#how-it-works [data-phone] [class*="aspect-"]').first().boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(Math.abs(box.height / box.width - 18.5 / 9)).toBeLessThan(0.05);
  });

  test('menu button opens a full-screen menu, whose links glide to their sections and close it', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    const open = page.getByRole('button', { name: /open menu/i });
    await expect(page.locator('#landing-menu')).toBeHidden();

    await open.click();
    await expect(page.locator('#landing-menu')).toBeVisible();
    await expect(page.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true');
    const links = page.locator('#landing-menu').getByRole('link');
    await expect(links).toHaveText(['01How it works', '02Get the app']);

    await links.nth(1).click();
    await expect(page.locator('#landing-menu')).toBeHidden();
    await expect(page.getByRole('heading', { name: /rider or driver\?/i })).toBeInViewport();
  });

  test('the menu closes on Escape', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /open menu/i }).click();
    await expect(page.locator('#landing-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#landing-menu')).toBeHidden();
  });

  test('draws the three points as they scroll through: the road draws itself in', async ({ page }) => {
    await page.goto('/');
    await page.locator('#what [data-draw]').waitFor({ state: 'attached' });
    const dash = () => page.locator('#what [data-draw]').evaluate((el) => parseFloat(el.getAttribute('stroke-dashoffset') ?? '0'));

    expect(await dash()).toBeGreaterThan(0.9); // not drawn yet, below the fold
    await page.evaluate(() => {
      const cell = document.querySelector('#what [data-point]')!;
      window.scrollTo({ top: cell.getBoundingClientRect().top + window.scrollY - innerHeight * 0.3, behavior: 'instant' });
    });
    await expect.poll(dash, { timeout: 6000 }).toBeLessThan(0.05);
  });

  test('lifts the question in the join section word by word as it arrives', async ({ page }) => {
    await page.goto('/');
    await page.locator('#join [data-hw]').first().waitFor({ state: 'attached' });
    const hidden = () => page.locator('#join [data-hw]').evaluateAll((els) =>
      els.every((el) => new DOMMatrix(getComputedStyle(el).transform).f > 10));

    expect(await hidden()).toBe(true);
    await page.evaluate(() => {
      const el = document.getElementById('join-heading')!;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - innerHeight * 0.5, behavior: 'instant' });
    });
    await expect.poll(async () => !(await hidden()), { timeout: 6000 }).toBe(true);
  });

  test('the controls are finger-sized: both hero buttons, the nav button and the menu button are at least 44px tall', async ({ page }) => {
    await page.goto('/');
    await page.locator('#top h1').waitFor();
    for (const locator of [
      page.getByRole('link', { name: /i'm a rider/i }),
      page.getByRole('link', { name: /i'm a driver/i }),
      page.getByRole('banner').getByRole('link', { name: 'Get the app' }),
      page.getByRole('button', { name: /open menu/i }),
    ]) {
      const box = (await locator.first().boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('has no sign in in the nav, but the footer keeps it for managers', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link', { name: /sign in/i })).toHaveCount(0);
    await expect(page.getByRole('contentinfo').getByRole('link', { name: /manager sign in/i })).toHaveAttribute('href', '/login');
  });
});

// A layout audit: at every width people really use, walk the whole page and look for anything
// that pokes out of the screen or sits behind the edge. (Decorative, hidden or invisible things
// are skipped: the giant outlined type is meant to be cropped.)
for (const width of [320, 360, 390, 430, 768, 1024]) {
  test.describe(`Landing page — layout at ${width}px wide`, () => {
    test.use({ viewport: { width, height: width < 700 ? 760 : 900 } });

    test('nothing that matters pokes out of the screen, and nothing scrolls sideways', async ({ page }) => {
      await page.goto('/');
      await page.locator('#join').waitFor();
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 400) {
        await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y);
        await page.waitForTimeout(60);
      }
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await page.waitForTimeout(800);

      const result = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const effectiveOpacity = (el: Element) => {
          for (let node: Element | null = el; node; node = node.parentElement) {
            if (Number(getComputedStyle(node).opacity) < 0.05) return 0;
          }
          return 1;
        };
        const offenders: string[] = [];
        let checked = 0;
        document.querySelectorAll('header *, main *, footer *').forEach((el) => {
          if (el.closest('[aria-hidden="true"], .sr-only, svg, video, img, canvas')) return;
          if (!(el instanceof HTMLElement)) return;
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || effectiveOpacity(el) === 0) return;
          if (!el.childNodes.length || !['A', 'BUTTON', 'INPUT', 'H1', 'H2', 'H3', 'P', 'LABEL', 'LI', 'SPAN'].includes(el.tagName)) return;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return;
          // The masked title words (and the line they sit in) are clipped on purpose.
          if (el.closest('.l-mask')) return;
          checked += 1;
          if (r.left < -1 || r.right > vw + 1) {
            offenders.push(`${el.tagName} "${(el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}`);
          }
        });
        return { offenders, checked, scrollWidth: document.documentElement.scrollWidth, vw };
      });

      expect(result.checked).toBeGreaterThan(40); // the audit really looked at the page (there is less copy than there was)
      expect(result.offenders).toEqual([]);
      expect(result.scrollWidth).toBeLessThanOrEqual(result.vw);
    });

    test('keeps the navigation pill inside the screen with a margin, and its button reachable', async ({ page }) => {
      await page.goto('/');
      const pill = (await page.locator('[data-nav-pill]').boundingBox())!;
      expect(pill.x).toBeGreaterThanOrEqual(8);
      expect(pill.x + pill.width).toBeLessThanOrEqual(width - 8);
      const cta = (await page.locator('[data-nav-pill] a[href="#join"]').boundingBox())!;
      expect(cta.x + cta.width).toBeLessThanOrEqual(pill.x + pill.width);
      expect(cta.x).toBeGreaterThan(pill.x);
    });

    if (width < 768) {
      test('draws the word PINGO on one line inside the screen, clear of the nav', async ({ page }) => {
        await page.goto('/');
        await page.locator('#top h1').waitFor();
        await expect
          .poll(() => page.locator('#top [data-hero-state]').evaluate((el) => parseFloat(el.style.getPropertyValue('--wd'))), { timeout: 8000 })
          .toBeLessThan(1.001); // the drop has landed and the word is at its resting size

        const word = await page.evaluate(() => {
          const win = document.querySelector('#top [data-window]') as HTMLElement;
          const [w, h] = getComputedStyle(win).maskSize.split(',')[0].trim().split(' ').map(parseFloat);
          const stage = document.querySelector('#top [data-hero-state]') as HTMLElement;
          const centre = stage.getBoundingClientRect().height / 2;
          const navBottom = document.querySelector('[data-nav-pill]')!.getBoundingClientRect().bottom;
          return { w, h, top: centre - h / 2, navBottom };
        });

        expect(word.w).toBeLessThanOrEqual(width - 8);
        expect(word.w).toBeGreaterThan(width * 0.85);
        expect(word.top).toBeGreaterThanOrEqual(word.navBottom);
      });
    }

    test('keeps the hero headline and both buttons on screen together at rest', async ({ page }) => {
      await page.goto('/');
      await page.locator('#top h1').waitFor();
      await page.waitForTimeout(600);
      const vh = page.viewportSize()!.height;
      for (const locator of [
        page.locator('#top h1 [data-q]'),
        page.getByRole('link', { name: /i'm a rider/i }),
        page.getByRole('link', { name: /i'm a driver/i }),
      ]) {
        const box = (await locator.first().boundingBox())!;
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(vh);
      }
    });
  });
}
