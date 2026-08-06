import { describe, it, expect } from 'vitest';
import {
  parsePlate, formatPlate, isValidPlate, cleanPlateInput, tidyPlate,
} from '../number-plate';

// Mirrors TrackMe-backend/tests/unit/number-plate.test.js. The two helpers have
// to agree, or the browser accepts a plate the server then rejects.

describe('formatPlate', () => {
  it.each([
    ['CAB-1234', 'CAB-1234'],
    ['cab 1234', 'CAB-1234'],
    ['CAB1234', 'CAB-1234'],
    ['PF- 2327', 'PF-2327'],
    ['pf2327', 'PF-2327'],
    ['62-1234', '62-1234'],
    ['300-1234', '300-1234'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatPlate(input)).toBe(expected);
  });

  it.each([
    ['WP CAB-1234', 'WP CAB-1234'],
    ['wpcab1234', 'WP CAB-1234'],
    ['sg-ka-9876', 'SG KA-9876'],
  ])('keeps the province on %s', (input, expected) => {
    expect(formatPlate(input)).toBe(expected);
  });

  it('reads WP-1234 as a plate rather than a province with nothing after it', () => {
    expect(parsePlate('WP-1234')).toEqual({ province: null, series: 'WP', digits: '1234' });
  });

  it.each([
    [''], ['CAB-123'], ['CAB-12345'], ['C-1234'], ['CABX-1234'], ['1234'], ['ZZ CAB-1234'],
  ])('rejects %s', (input) => {
    expect(formatPlate(input)).toBe('');
    expect(isValidPlate(input)).toBe(false);
  });
});

describe('cleanPlateInput', () => {
  it('uppercases and drops characters a plate can never contain', () => {
    expect(cleanPlateInput('cab@1234!')).toBe('CAB1234');
  });

  it('keeps spaces and hyphens so the value can still be typed through', () => {
    expect(cleanPlateInput('wp cab-12')).toBe('WP CAB-12');
  });
});

describe('tidyPlate', () => {
  it('canonicalises a plate that parses', () => {
    expect(tidyPlate('pf- 2327')).toBe('PF-2327');
  });

  it('hands back what was typed when it does not parse, so it can be corrected', () => {
    expect(tidyPlate('  not a plate  ')).toBe('not a plate');
  });
});
