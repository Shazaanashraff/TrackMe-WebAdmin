// Everything on the landing page that is content or an external dependency, in
// one place so the people who own copy and links never need to open a component.

// Hero background clip. `null` = none yet: the hero renders its animated route
// map instead. To use a clip, drop the files in public/landing/ and set e.g.
//   { mp4: '/landing/hero.mp4', webm: '/landing/hero.webm', poster: '/landing/hero-poster.jpg' }
export const HERO_VIDEO = null;

// Store listings for the passenger app. `null` renders a "Coming soon" button
// rather than a link that goes nowhere.
export const APP_LINKS = { ios: null, android: null };

// Where the driver email form POSTs, relative to the API base URL (e.g.
// '/api/leads/driver'). `null` = no backend endpoint exists yet, so the form
// validates and then says plainly that nothing was sent. The request shape is
// { email, source: 'landing' } -- the backend must match it (see driverInterest.js).
export const DRIVER_INTEREST_ENDPOINT = null;

export const PRIVACY_URL = 'https://shazaanashraff.github.io/trackme-privacy/';

export const NAV_LINKS = [
  { label: 'Why TrackMe', href: '#what' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Get the app', href: '#join' },
];

// The one big sentence under the hero. It lights up word by word as you scroll.
export const STATEMENT = 'School runs, campus shuttles and office rides. Every one on a single live map.';

// Three real capabilities, said in a handful of words each.
export const POINTS = [
  { key: 'live', title: 'Live map', body: 'See every vehicle, right now.' },
  { key: 'riders', title: 'Approved riders', body: 'Join by key. Managers approve.' },
  { key: 'fleet', title: 'Fleet control', body: 'Vehicles, drivers, routes. One place.' },
];

export const STORY = [
  {
    key: 'track',
    audience: 'For riders',
    title: 'See it coming.',
    body: 'Watch your shuttle move, with a live arrival time.',
    device: 'phone',
  },
  {
    key: 'join',
    audience: 'For riders',
    title: 'Join with a key.',
    body: 'Your driver shares it. Your manager approves.',
    device: 'phone',
  },
  {
    key: 'family',
    audience: 'For riders',
    title: 'One login, every rider.',
    body: 'Add children or staff. Follow each one.',
    device: 'phone',
  },
  {
    key: 'manage',
    audience: 'For fleet managers',
    title: 'Run the whole fleet.',
    body: 'Vehicles, drivers, requests and live positions in one portal.',
    device: 'laptop',
  },
];

// Real captures of the manager portal (dark theme), cycled inside the laptop.
export const PORTAL_SHOTS = [
  { src: '/landing/portal-overview.jpg', alt: 'Manager overview: total, active and pending vehicle counts' },
  { src: '/landing/portal-vehicles.jpg', alt: 'Vehicle management table with driver, route and status' },
  { src: '/landing/portal-drivers.jpg', alt: 'Driver directory with vehicles and enrollment keys' },
  { src: '/landing/portal-enrollments.jpg', alt: 'Enrollment queue with approve and decline actions' },
];
