import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingNav } from '../LandingNav';
import { NAV_LINKS } from '../config';

const renderNav = () => render(<MemoryRouter><LandingNav /></MemoryRouter>);
const pill = (container) => container.querySelector('[data-nav-pill]');

const scrollTo = (y) => act(async () => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  window.dispatchEvent(new Event('scroll'));
  await new Promise((r) => setTimeout(r, 40)); // the nav reads scroll on the next animation frame
});

const section = (id, top) => {
  const el = document.createElement('section');
  el.id = id;
  el.getBoundingClientRect = () => ({ top });
  document.body.appendChild(el);
};

beforeEach(() => { Object.defineProperty(window, 'scrollY', { value: 0, configurable: true }); });
afterEach(() => { document.body.innerHTML = ''; });

describe('LandingNav (the floating pill)', () => {
  it('is a banner holding the brand, the section link and the one button, "Get the app"', () => {
    renderNav();
    const banner = screen.getByRole('banner');

    expect(within(banner).getByRole('link', { name: /pingo home/i })).toHaveAttribute('href', '#top');
    const nav = within(banner).getByRole('navigation', { name: 'Landing' });
    expect(within(nav).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(NAV_LINKS.map((l) => l.href));
    const cta = within(banner).getByRole('link', { name: 'Get the app' });
    expect(cta).toHaveAttribute('href', '#join');
    expect(cta.className).toMatch(/bg-l-bone/); // the one filled button: the primary action
  });

  it('has no manager sign in (it lives in the footer) and no turning ring around the mark', () => {
    const { container } = renderNav();

    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull();
    expect(container.querySelector('textPath')).toBeNull();
  });

  it('floats as a rounded, blurred pill with a glint on its edge rather than a bar across the page', () => {
    const { container } = renderNav();
    const el = pill(container);

    expect(el.className).toMatch(/rounded-full/);
    expect(el.className).toMatch(/backdrop-blur/);
    expect(el.className).toMatch(/l-nav-glint/);
    expect(el.className).toMatch(/max-w-\[38rem\]/);
    // The strip it lives in lets clicks through everywhere except on the pill itself.
    expect(screen.getByRole('banner').className).toMatch(/pointer-events-none/);
    expect(el.className).toMatch(/pointer-events-auto/);
  });

  it('shows a live dot beside the mark and keeps the name for assistive tech on the narrowest phones', () => {
    renderNav();
    const home = screen.getByRole('link', { name: /pingo home/i });

    expect(home.querySelector('[style*="l-ping"]')).not.toBeNull();
    expect(within(home).getByText('Pingo').className).toMatch(/max-\[359px\]:sr-only/);
  });

  it('is a little clearer once the page has scrolled, so it reads over any section', async () => {
    const { container } = renderNav();
    expect(pill(container)).toHaveAttribute('data-scrolled', 'false');
    const before = pill(container).className;

    await scrollTo(300);

    await waitFor(() => expect(pill(container)).toHaveAttribute('data-scrolled', 'true'));
    expect(pill(container).className).not.toBe(before);
  });

  it('marks the link of the section you are in', async () => {
    section('what', -600);
    section('how-it-works', 40); // its top has passed the line: this is where we are
    section('join', 900);
    renderNav();

    await waitFor(() => {
      const nav = screen.getByRole('navigation', { name: 'Landing' });
      expect(within(nav).getByRole('link', { name: 'How it works' })).toHaveAttribute('aria-current', 'location');
    });
  });

  it('lights one of four ticks for the section you are in', async () => {
    section('what', -600);
    section('how-it-works', 40);
    section('join', 900);
    const { container } = renderNav();

    await waitFor(() => {
      const ticks = Array.from(container.querySelectorAll('[data-tick]'));
      expect(ticks).toHaveLength(4);
      expect(ticks.map((t) => t.getAttribute('data-tick'))).toEqual(['off', 'off', 'on', 'off']);
    });
  });

  it('fills a thin line along its bottom edge as the page scrolls', async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 3000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    const { container } = renderNav();

    await scrollTo(1000); // halfway down the 2000px there is to scroll

    await waitFor(() => expect(container.querySelector('[data-nav-progress]').style.transform).toBe('scaleX(0.5)'));
  });

  it('slides away on the way down and comes back on the way up, and stays near the top', async () => {
    renderNav();
    const header = screen.getByRole('banner');

    await scrollTo(60);
    await waitFor(() => expect(header.className).not.toMatch(/-translate-y-\[150%\]/));

    await scrollTo(600);
    await waitFor(() => expect(header.className).toMatch(/-translate-y-\[150%\]/));

    await scrollTo(450);
    await waitFor(() => expect(header.className).not.toMatch(/-translate-y-\[150%\]/));
  });

  it('hides the section link on a narrow screen, where the menu button and the one button are enough', () => {
    renderNav();
    expect(screen.getByRole('navigation', { name: 'Landing' }).className).toMatch(/hidden/);
    expect(screen.getByRole('navigation', { name: 'Landing' }).className).toMatch(/md:flex/);
    expect(screen.getByRole('button', { name: /open menu/i }).className).toMatch(/md:hidden/);
  });
});

describe('LandingNav (the phone menu)', () => {
  const menu = () => document.getElementById('landing-menu');

  it('starts closed: not in the accessibility tree and its links out of the tab order', () => {
    renderNav();
    const button = screen.getByRole('button', { name: /open menu/i });

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'landing-menu');
    expect(menu()).toHaveAttribute('aria-hidden', 'true');
    expect(menu().className).toMatch(/invisible/);
    menu().querySelectorAll('a').forEach((a) => expect(a).toHaveAttribute('tabindex', '-1'));
  });

  it('opens from the button with every destination as a big numbered link', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true');
    expect(menu()).toHaveAttribute('aria-hidden', 'false');
    expect(menu().className).toMatch(/(^| )visible/);
    expect(menu().style.clipPath).toMatch(/circle\(150vmax/);
    const links = within(menu()).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#how-it-works', '#join']);
    expect(links.map((a) => a.textContent)).toEqual(['01How it works', '02Get the app']);
    links.forEach((a) => expect(a).toHaveAttribute('tabindex', '0'));
  });

  it('keeps the scroll library and touch gestures out of the open menu', () => {
    renderNav();

    expect(menu()).toHaveAttribute('data-lenis-prevent');
    expect(menu().className).toMatch(/touch-none/);
  });

  it('closes when a link is chosen, and on Escape', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.click(within(menu()).getByRole('link', { name: /get the app/i }));
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute('aria-expanded', 'false');
    expect(menu().style.clipPath).toMatch(/circle\(0px/);
  });

  it('closes by itself if the window grows past the phone layout', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute('aria-expanded', 'false');
  });
});
