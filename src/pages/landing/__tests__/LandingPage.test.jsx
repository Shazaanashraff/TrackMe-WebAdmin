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

  it('keeps a manager sign-in path in the nav and the footer', () => {
    renderPage();

    const links = screen.getAllByRole('link', { name: /manager sign in/i });
    expect(links.length).toBeGreaterThanOrEqual(2);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/login'));
  });

  it('is built from the sections the brief asks for, in order', () => {
    const { container } = renderPage();

    const ids = Array.from(container.querySelectorAll('main > section')).map((s) => s.id);
    expect(ids).toEqual(['top', 'what', 'how-it-works', 'join']);
  });

  it('says what TrackMe is in one sentence and three short points', () => {
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

  it('does not link store buttons anywhere until real store URLs exist', () => {
    renderPage();

    const join = document.getElementById('join');
    expect(within(join).getByRole('button', { name: /iphone/i })).toBeDisabled();
    expect(within(join).getByRole('button', { name: /android/i })).toBeDisabled();
    expect(within(join).getAllByText(/coming soon/i)).toHaveLength(2);
  });

  it('sets a branded document title while mounted and restores it after', () => {
    document.title = 'before';
    const { unmount } = renderPage();
    expect(document.title).toMatch(/TrackMe/);
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
