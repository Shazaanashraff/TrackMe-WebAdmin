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
  { label: 'What is TrackMe', href: '#what' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Get started', href: '#join' },
];

export const PILLARS = [
  {
    key: 'live',
    title: 'Live tracking',
    body: 'See where each vehicle is right now on a map, updated as the driver moves.',
    span: 'lg:col-span-2',
  },
  {
    key: 'enroll',
    title: 'Approved enrollment',
    body: 'Riders join a driver with a key. Private drivers need a manager to approve first.',
    span: '',
  },
  {
    key: 'fleet',
    title: 'Fleet control',
    body: 'Vehicles, drivers, routes and rider requests, managed from one portal.',
    span: '',
  },
  {
    key: 'routes',
    title: 'Built around real routes',
    body: 'Start from public routes or draw your own custom route for a school, campus or office.',
    span: 'sm:col-span-2 lg:col-span-4',
  },
];

export const STORY = [
  {
    key: 'track',
    audience: 'For riders',
    title: 'See where your ride is, right now.',
    body: 'Open the map and watch your shuttle move along its route, with the next stop and a live arrival time. No more standing at the gate guessing.',
    device: 'phone',
  },
  {
    key: 'join',
    audience: 'For riders',
    title: 'Join your driver with a key.',
    body: 'Your driver shares an enrollment key. Enter it once. For private drivers the fleet manager approves your request, and you can see its status as it happens.',
    device: 'phone',
  },
  {
    key: 'family',
    audience: 'For riders',
    title: 'One account, every rider.',
    body: 'Add a child or an employee as a managed profile and follow each of them separately, from a single login.',
    device: 'phone',
  },
  {
    key: 'manage',
    audience: 'For fleet managers',
    title: 'Your whole fleet, on one screen.',
    body: 'Vehicles, drivers, enrollments and live positions in the manager portal. Approve riders, assign routes and keep every shuttle in view from your desk.',
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
