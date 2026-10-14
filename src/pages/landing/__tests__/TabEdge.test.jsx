import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TabEdge } from '../TabEdge';

const tab = (props) => render(<TabEdge {...props} />).container.firstChild;

describe('TabEdge (the seam between two sections)', () => {
  it('is pure decoration: hidden from assistive tech and never takes a click', () => {
    const el = tab();

    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.className).toMatch(/pointer-events-none/);
  });

  it('is drawn in the colour of the section above, which it hangs from', () => {
    expect(tab({ tone: 'ink' })).toHaveClass('text-l-ink');
    expect(tab({ tone: 'bone' })).toHaveClass('text-l-bone');
    expect(tab({ tone: 'sky' })).toHaveClass('text-l-sky');
    expect(tab({ tone: 'bone' })).toHaveAttribute('data-tab', 'bone');
  });

  it('defaults to ink, and falls back to it for a tone it does not know', () => {
    expect(tab()).toHaveClass('text-l-ink');
    expect(tab({ tone: 'plum' })).toHaveClass('text-l-ink');
  });

  it('hangs down over the section below: pinned to its top edge and drawn above that section', () => {
    const el = tab();

    expect(el.className).toMatch(/absolute/);
    expect(el.className).toMatch(/top-0/);
    expect(el.className).toMatch(/inset-x-0/);
    expect(el.className).toMatch(/z-20/);
  });

  it('is two soft S-shaped shoulders with a flat middle between them, filled in the tab colour', () => {
    const el = tab();
    const shoulders = el.querySelectorAll('svg');

    expect(shoulders).toHaveLength(2);
    shoulders.forEach((svg) => {
      expect(svg).toHaveClass('fill-current');
      expect(svg.getAttribute('preserveAspectRatio')).toBe('none'); // stretches to its slot
      // A curve (C), not a straight step: that is what makes the shoulder soft.
      expect(svg.querySelector('path').getAttribute('d')).toMatch(/C/);
    });
    expect(el.querySelector('.bg-current')).not.toBeNull();
  });

  it('has mirror-image shoulders: each flush with the section edge at its outer end, full depth at its inner end', () => {
    const [left, right] = Array.from(tab().querySelectorAll('path')).map((p) => p.getAttribute('d'));

    // Left shoulder is at full depth (y=24) on its right and flat (y=0) on its left; the right
    // shoulder is the other way round.
    expect(left).toMatch(/V24/);
    expect(left).toMatch(/0Z$/);
    expect(right).toMatch(/H64C/);
    expect(right).toMatch(/24Z$/);
  });

  it('keeps clear of the screen edges, so the section above still runs flat out to both sides', () => {
    const inner = tab().firstChild;
    expect(inner.className).toMatch(/mx-\[5%\]/);
    expect(inner.className).toMatch(/sm:mx-\[14%\]/);
  });

  it('is shallower on a phone than on a wide screen', () => {
    const el = tab();
    expect(el.className).toMatch(/\bh-5\b/);
    expect(el.className).toMatch(/sm:h-8/);
  });

  it('takes an extra class from its caller', () => {
    expect(tab({ className: 'extra' })).toHaveClass('extra');
  });
});
