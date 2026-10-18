import { describe, expect, it } from 'vitest';
import { headingOf, vehicleIconSvg, vehicleIconUrl } from '@/lib/vehicle-icon';

describe('vehicleIconSvg', () => {
  it('turns the vehicle about the centre of the viewBox', () => {
    expect(vehicleIconSvg({ heading: 135 })).toContain('rotate(135 27 27)');
  });

  it('faces north without a usable heading', () => {
    expect(vehicleIconSvg()).toContain('rotate(0 27 27)');
    expect(vehicleIconSvg({ heading: 'east' })).toContain('rotate(0 27 27)');
  });

  it('normalises headings outside 0-359', () => {
    expect(vehicleIconSvg({ heading: 450 })).toContain('rotate(90 27 27)');
    expect(vehicleIconSvg({ heading: -90 })).toContain('rotate(270 27 27)');
  });

  it('outlines the van in the tracking-state colour', () => {
    expect(vehicleIconSvg({ accent: '#b45309' })).toContain('stroke="#b45309"');
  });

  it('draws the van on its own, with no badge circle', () => {
    expect(vehicleIconSvg()).not.toContain('<circle');
  });
});

describe('vehicleIconUrl', () => {
  it('encodes the SVG as an image data URI', () => {
    const url = vehicleIconUrl({ heading: 45, accent: '#15803d' });
    expect(url.startsWith('data:image/svg+xml;charset=UTF-8,')).toBe(true);
    expect(decodeURIComponent(url.split(',')[1])).toBe(vehicleIconSvg({ heading: 45, accent: '#15803d' }));
  });
});

describe('headingOf', () => {
  it('reads the heading the driver sent', () => {
    expect(headingOf({ heading: 90 })).toBe(90);
    expect(headingOf({ heading: '180' })).toBe(180);
  });

  it('treats 0 (due north) as a real heading', () => {
    expect(headingOf({ heading: 0 })).toBe(0);
  });

  it('returns null when the driver sent none (parked) or there is no location', () => {
    expect(headingOf({ heading: null })).toBeNull();
    expect(headingOf({})).toBeNull();
    expect(headingOf(null)).toBeNull();
    expect(headingOf({ heading: '' })).toBeNull();
    expect(headingOf({ heading: 'north' })).toBeNull();
  });
});
