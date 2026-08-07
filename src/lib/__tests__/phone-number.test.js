import { describe, it, expect } from 'vitest';
import { cleanPhoneInput, formatPhone, isValidPhone } from '../phone-number';

// Mirrors TrackMe-backend/tests/unit/phone-number.test.js. The two have to
// agree, or the browser accepts a number the server then rejects.

describe('cleanPhoneInput', () => {
  it('stops a local number at ten digits', () => {
    expect(cleanPhoneInput('0755613572222222222225')).toBe('0755613572');
  });

  it('allows eleven digits behind a +, for 94 plus the nine', () => {
    expect(cleanPhoneInput('+947556135729999')).toBe('+94755613572');
  });

  it('drops spaces, dashes and letters as they are typed', () => {
    expect(cleanPhoneInput('077 123-4567')).toBe('0771234567');
    expect(cleanPhoneInput('077abc4567')).toBe('0774567');
  });

  it('keeps a lone + so the country code can still be typed', () => {
    expect(cleanPhoneInput('+')).toBe('+');
  });
});

describe('isValidPhone', () => {
  it.each([['0771234567'], ['0112345678'], ['+94771234567']])('accepts %s', (input) => {
    expect(isValidPhone(input)).toBe(true);
  });

  it.each([['077123456'], ['7712345678'], ['+94771234'], ['+4471234567'], ['']])(
    'rejects %s',
    (input) => {
      expect(isValidPhone(input)).toBe(false);
    }
  );

  // The input cap truncates, and validation must not: a long typo is a
  // rejection, not a ten-digit number with the tail quietly dropped.
  it.each([['0755613572222222222225'], ['07712345678'], ['+947712345678']])(
    'rejects %s rather than trimming it',
    (input) => {
      expect(isValidPhone(input)).toBe(false);
    }
  );
});

describe('formatPhone', () => {
  it('keeps the form it was given', () => {
    expect(formatPhone('077 123 4567')).toBe('0771234567');
    expect(formatPhone('+94 77 123 4567')).toBe('+94771234567');
  });
});
