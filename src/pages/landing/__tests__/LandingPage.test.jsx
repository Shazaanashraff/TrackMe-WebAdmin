import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../LandingPage';
import { STORY } from '../config';

const renderPage = () => render(<MemoryRouter><LandingPage /></MemoryRouter>);

describe('LandingPage', () => {
  it('opens with the hero headline and both audience calls to action', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/where.s the shuttle\?/i);
    expect(screen.getByRole('link', { name: /i'm a rider/i })).toHaveAttribute('href', '#join');
    expect(screen.getByRole('link', { name: /i'm a driver/i })).toHaveAttribute('href', '#join');
  });

  it('keeps the manager sign-in path in the footer, not in the nav', () => {
    const { container } = renderPage();

    const links = screen.getAllByRole('link', { name: /manager sign in/i });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/login');
    expect(container.querySelector('footer').contains(links[0])).toBe(true);
    expect(within(screen.getByRole('banner')).queryByRole('link', { name: /sign in/i })).toBeNull();
  });

  it('is built from the sections the brief asks for, in order', () => {
    const { container } = renderPage();

    const ids = Array.from(container.querySelectorAll('main > section')).map((s) => s.id);
    expect(ids).toEqual(['top', 'what', 'how-it-works', 'join']);
  });

  it('hangs a tab over the top of every section that follows a different one: ink, paper, ink, then paper', () => {
    const { container } = renderPage();

    const tabs = Array.from(container.querySelectorAll('[data-tab]'));
    expect(tabs.map((t) => t.getAttribute('data-tab'))).toEqual(['ink', 'bone', 'ink', 'bone']);
    // Each belongs to the section it hangs over: the paper section, the story, the join section and the footer.
    expect(tabs.map((t) => t.closest('section, footer').id || t.closest('section, footer').tagName.toLowerCase()))
      .toEqual(['what', 'how-it-works', 'join', 'footer']);
  });

  it('floats the navigation as a pill above everything, outside the main content', () => {
    const { container } = renderPage();
    const banner = screen.getByRole('banner');

    expect(banner.querySelector('[data-nav-pill]')).not.toBeNull();
    expect(container.querySelector('main').contains(banner)).toBe(false);
  });

  it('ends on the finale: a footer that opens a circle of sky and fills a giant wordmark', () => {
    const { container } = renderPage();
    const footer = container.querySelector('footer');

    expect(footer.querySelector('[data-wipe]')).not.toBeNull();
    expect(footer.querySelector('[data-fill]')).not.toBeNull();
    expect(within(footer).getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
  });

  it('says what Pingo is in one sentence and three short points', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /school runs, campus shuttles/i })).toBeInTheDocument();
  });

  it('tells every step of the how-it-works story (stacked layout without matchMedia)', () => {
    renderPage();
    STORY.forEach((step) => {
      expect(screen.getByRole('heading', { level: 3, name: step.title })).toBeInTheDocument();
    });
  });

  it('shows the laptop view of the manager portal as the last step', () => {
    renderPage();
    const images = screen.getAllByRole('img', { hidden: true });
    expect(images.some((img) => /enrollment queue/i.test(img.alt))).toBe(true);
  });

  it('offers riders a download and drivers an email form, in one section', () => {
    renderPage();

    const join = document.getElementById('join');
    expect(within(join).getByRole('heading', { name: /rider or driver\?/i })).toBeInTheDocument();
    expect(within(join).getByLabelText('Your email')).toBeInTheDocument();
    expect(within(join).getByRole('button', { name: /get driver access/i })).toBeInTheDocument();
  });

  it('offers a direct download for both apps instead of "Coming soon"', () => {
    renderPage();

    const join = document.getElementById('join');
    expect(within(join).getByRole('link', { name: /rider app/i })).toHaveAttribute('href', expect.stringMatching(/rider-app.*\.apk$/));
    expect(within(join).getByRole('link', { name: /driver app/i })).toHaveAttribute('href', expect.stringMatching(/driver-app.*\.apk$/));
    expect(within(join).queryByText(/coming soon/i)).toBeNull();
  });

  it('sets a branded document title while mounted and restores it after', () => {
    document.title = 'before';
    const { unmount } = renderPage();
    expect(document.title).toMatch(/Pingo/);
    unmount();
    expect(document.title).toBe('before');
  });

  it('invents no numbers: no stats, ratings or user counts in the copy', () => {
    renderPage();
    const text = document.querySelector('.landing').textContent;
    expect(text).not.toMatch(/\d[\d,]*\s*\+?\s*(riders|drivers|users|schools|vehicles|downloads)/i);
    expect(text).not.toMatch(/rated|testimonial/i);
  });
});
