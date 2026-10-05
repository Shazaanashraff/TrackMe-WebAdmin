import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RouteRail } from '../RouteRail';

describe('RouteRail', () => {
  it('is purely decorative: hidden from assistive tech and never intercepts a tap', () => {
    const { container } = render(<RouteRail />);
    const rail = container.firstChild;

    expect(rail).toHaveAttribute('aria-hidden', 'true');
    expect(rail.className).toMatch(/pointer-events-none/);
  });

  it('starts at the beginning of the route and stays invisible until the visitor scrolls', () => {
    const { container } = render(<RouteRail />);
    const rail = container.firstChild;

    expect(rail).toHaveAttribute('data-progress', '0.000');
    expect(rail).toHaveAttribute('data-stop', '0');
    expect(rail.className).toMatch(/opacity-0/);
  });

  it('draws one stop per section after the start, none reached yet', () => {
    const { container } = render(<RouteRail />);
    const stops = container.querySelectorAll('[data-reached]');

    expect(stops).toHaveLength(3);
    stops.forEach((stop) => expect(stop).toHaveAttribute('data-reached', 'false'));
  });
});
