// Sri Lankan vehicle number plates, mirroring src/utils/numberPlate.js in the
// backend. Kept in step deliberately: the browser formats and rejects a plate
// before it is sent, and the server applies the same rule to anything that
// arrives by another route.
//
//   CAB-1234      current issue: two or three letters, then four digits
//   WP CAB-1234   the same, carrying the province of registration
//   62-1234       pre-2000 issue: two or three digits, then four digits

export const PROVINCES = {
  WP: 'Western',
  CP: 'Central',
  SP: 'Southern',
  NP: 'Northern',
  EP: 'Eastern',
  NW: 'North Western',
  NC: 'North Central',
  UP: 'Uva',
  SG: 'Sabaragamuwa',
};

const PROVINCE_CODES = Object.keys(PROVINCES);

const LETTER_PLATE = /^([A-Z]{2,3})(\d{4})$/;
const NUMERIC_PLATE = /^(\d{2,3})(\d{4})$/;

const strip = (value) => String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// A leading province code counts as a province only when what follows is itself
// a whole plate, because "WP-1234" is an ordinary plate whose series happens to
// spell a province.
export function parsePlate(value) {
  const raw = strip(value);
  if (!raw) return null;

  const asPlate = (body, province = null) => {
    const letters = body.match(LETTER_PLATE);
    if (letters) return { province, series: letters[1], digits: letters[2] };
    const numeric = body.match(NUMERIC_PLATE);
    if (numeric) return { province, series: numeric[1], digits: numeric[2] };
    return null;
  };

  const withoutProvince = asPlate(raw);
  if (withoutProvince) return withoutProvince;

  const code = raw.slice(0, 2);
  if (PROVINCE_CODES.includes(code)) {
    const rest = asPlate(raw.slice(2), code);
    if (rest) return rest;
  }

  return null;
}

// '' when the input is not a plate, so callers can tell "nothing usable" from a
// real value.
export function formatPlate(value) {
  const parsed = parsePlate(value);
  if (!parsed) return '';
  const plate = `${parsed.series}-${parsed.digits}`;
  return parsed.province ? `${parsed.province} ${plate}` : plate;
}

export const isValidPlate = (value) => parsePlate(value) !== null;

export const PLATE_FORMAT_MESSAGE =
  'Enter a Sri Lankan number plate, for example CAB-1234, WP CAB-1234 or 62-1234';

export const PLATE_PLACEHOLDER = 'CAB-1234';

// Typing help: uppercase and drop anything that could never appear, but leave
// the value alone otherwise. Tidying into the canonical form waits for blur, so
// the cursor is not yanked around mid-word.
export const cleanPlateInput = (value) =>
  String(value ?? '').toUpperCase().replace(/[^A-Z0-9\s-]/g, '');

// On blur: canonicalise when it parses, otherwise hand back what was typed so
// the manager can see and fix their own text.
export const tidyPlate = (value) => formatPlate(value) || String(value ?? '').trim();
