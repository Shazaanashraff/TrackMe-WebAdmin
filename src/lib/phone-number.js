// Sri Lankan phone numbers, mirroring src/utils/phoneNumber.js in the backend.
// Kept in step deliberately, so the browser and the server agree on what counts.
//
//   0771234567     local: a leading 0 then nine digits, ten in total
//   +94771234567   international: +94 then the same nine digits

const LOCAL = /^0\d{9}$/;
const INTERNATIONAL = /^\+94\d{9}$/;

const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');

// Caps what can be typed: ten digits, or eleven behind a + since that carries
// the 94 country code.
export function cleanPhoneInput(value) {
  const raw = String(value ?? '').trim();
  const digits = digitsOnly(raw);

  if (raw.startsWith('+')) return `+${digits.slice(0, 11)}`;
  return digits.slice(0, 10);
}

// '' when the input is not a Sri Lankan number, so callers can tell a typo from
// a real value.
//
// Note this does NOT go through cleanPhoneInput: that caps the length, which is
// right while someone is typing but would quietly turn a fourteen-digit typo
// into a valid ten-digit number instead of rejecting it.
export function formatPhone(value) {
  const raw = String(value ?? '').trim();
  const candidate = raw.startsWith('+') ? `+${digitsOnly(raw)}` : digitsOnly(raw);

  if (LOCAL.test(candidate) || INTERNATIONAL.test(candidate)) return candidate;
  return '';
}

export const isValidPhone = (value) => formatPhone(value) !== '';

export const PHONE_FORMAT_MESSAGE =
  'Enter a Sri Lankan phone number, for example 0771234567 or +94771234567';

// A shape, not a number: a full one in the box reads as real data already
// entered.
export const PHONE_PLACEHOLDER = '07X XXX XXXX';
