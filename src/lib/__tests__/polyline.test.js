import { describe, it, expect } from 'vitest';
import { decodePolyline } from '../polyline';

describe('decodePolyline', () => {
  it('decodes the canonical Google example polyline', () => {
    const coords = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(coords).toHaveLength(3);
    expect(coords[0][0]).toBeCloseTo(38.5, 4);
    expect(coords[0][1]).toBeCloseTo(-120.2, 4);
    expect(coords[2][0]).toBeCloseTo(43.252, 3);
    expect(coords[2][1]).toBeCloseTo(-126.453, 3);
  });

  it('returns an empty array for an empty/missing polyline', () => {
    expect(decodePolyline('')).toEqual([]);
    expect(decodePolyline(undefined)).toEqual([]);
  });
});
