// Everything on the landing page that is content or an external dependency, in
// one place so the people who own copy and links never need to open a component.

// The hero's film clip: a daylight shot of a shuttle bus coming through a junction (muted, loops).
// Two cuts of the same 4K footage, both H.264:
//   wide  1920x1080 (~9 MB): desktops, laptops, a phone on its side
//   tall  810x1440 (~6 MB): a portrait cut that follows the bus, for a phone held upright
// Each clip:
//   src      the file                           poster  shown while it loads (the first frame)
//   still    shown instead of the video for visitors who prefer reduced motion
//   width / height   the clip's own size        focus   where the bus is at the start, as a 0..1
//                                                        point in the frame: the opening window sits on it
// Set to `null` and the hero draws its coded night road instead (NightRoad.jsx).
// Licence/brand note: the footage shows a real operator's livery, so confirm it may be used.
export const HERO_VIDEO = {
  wide: {
    src: '/landing/hero.mp4',
    poster: '/landing/hero-poster.webp',
    still: '/landing/hero-still.webp',
    width: 1920,
    height: 1080,
    focus: { x: 0.27, y: 0.53 },
  },
  tall: {
    src: '/landing/hero-tall.mp4',
    poster: '/landing/hero-tall-poster.webp',
    still: '/landing/hero-tall-still.webp',
    width: 810,
    height: 1440,
    focus: { x: 0.5, y: 0.53 },
  },
};

// Direct APK downloads for both apps, served from /public/downloads. A release registered by a
// super-admin (see useAppDownloadLinks) overrides these. The iOS entries are `null` until an iOS
// release (e.g. a TestFlight URL) is registered on the Releases page; the badge shows
// "Coming soon" until then.
export const APP_LINKS = {
  ios: null,
  driverIos: null,
  android: '/downloads/rider-app-1.0.0.apk',
  driver: '/downloads/driver-app-1.0.0.apk',
};

// Where the driver email form POSTs, relative to the API base URL (e.g.
// '/api/leads/driver'). `null` = no backend endpoint exists yet, so the form
// validates and then says plainly that nothing was sent. The request shape is
// { email, source: 'landing' } -- the backend must match it (see driverInterest.js).
export const DRIVER_INTEREST_ENDPOINT = null;

export const PRIVACY_URL = 'https://shazaanashraff.github.io/pingo-privacy/';

// The links in the nav (the "Get the app" button beside them is its own thing, see LandingNav).
export const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
];

// The one big sentence under the hero. It lights up word by word as you scroll.
export const STATEMENT = 'School runs, campus shuttles and office rides. Every one on a single live map.';

// Three real capabilities, said in a handful of words each.
export const POINTS = [
  { key: 'live', title: 'Live map' },
  { key: 'riders', title: 'Approved riders' },
  { key: 'fleet', title: 'Fleet control' },
];

export const STORY = [
  {
    key: 'track',
    audience: 'For riders',
    title: 'See it coming.',
    device: 'phone',
  },
  {
    key: 'join',
    audience: 'For riders',
    title: 'Join with a key.',
    device: 'phone',
  },
  {
    key: 'family',
    audience: 'For riders',
    title: 'One login, every rider.',
    device: 'phone',
  },
  {
    key: 'manage',
    audience: 'For fleet managers',
    title: 'Run the whole fleet.',
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
