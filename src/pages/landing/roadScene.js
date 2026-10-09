// The maths behind the hero's night-road scene. No canvas, no DOM: pure
// functions of time and screen size, so the whole scene is deterministic and
// can be unit-tested. NightRoad.jsx only turns these numbers into pixels.
//
// World model: the camera sits low on the road looking down it. `Z` is
// distance ahead of the camera, `X` is sideways (negative = left, and this is
// left-hand traffic, so our lane is on the left), `height` is up.
// Perspective is the usual 1/Z: a thing twice as far away is half the size and
// half as far from the horizon.

export const Z_NEAR = 0.9; // closer than this and a thing has passed the camera
export const Z_FAR = 64; // beyond this it is lost in the haze
export const SPEED = 9; // how fast the camera moves down the road, units/second

export const LANE = { ours: -1.7, oncoming: 1.7 };
export const ROAD_HALF_WIDTH = 3.3;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Where things sit on this screen. Portrait phones get a higher horizon and a bigger world. */
export function makeView(width, height) {
  const portrait = height > width;
  return {
    width,
    height,
    portrait,
    horizon: height * (portrait ? 0.27 : 0.46),
    vpx: width * (portrait ? 0.5 : 0.8),
    // Pixels per world unit at Z = 1. Taller of the two so a phone is not a postage stamp.
    unit: portrait ? Math.max(width * 0.22, height * 0.2) : Math.max(width * 0.22, height * 0.13),
  };
}

/** Project a world point to the screen. `s` is the scale at that depth (1 / Z). */
export function project(view, { Z, X = 0, height = 0 }) {
  const s = 1 / Z;
  const groundY = view.horizon + (view.height - view.horizon) * s;
  return {
    x: view.vpx + X * view.unit * s,
    y: groundY - height * view.unit * s,
    groundY,
    s,
  };
}

/** Brings any distance into [Z_NEAR, Z_FAR) by looping it, so things recycle instead of vanishing. */
export function wrapZ(z, near = Z_NEAR, far = Z_FAR) {
  const span = far - near;
  return near + ((((z - near) % span) + span) % span);
}

/** Depths of the things that line the road at a fixed spacing, streaming towards the camera. */
export function streamZs(t, spacing, speed = SPEED, near = Z_NEAR, far = Z_FAR) {
  const count = Math.ceil((far - near) / spacing) + 1;
  const offset = (t * speed) % spacing;
  const zs = [];
  for (let i = 0; i < count; i += 1) {
    const z = near + i * spacing - offset;
    if (z >= near && z < far) zs.push(z);
  }
  return zs;
}

/** Depth of a car at time t. `closing` is how fast it approaches the camera (negative = pulls away). */
export function carZ(car, t) {
  return wrapZ(car.z0 - car.closing * t);
}

/** The cars on the road. Fixed, so the scene looks the same on every load. */
export const CARS = [
  { id: 'o1', lane: 'oncoming', z0: 12, closing: 20, kind: 'head' },
  { id: 'o2', lane: 'oncoming', z0: 31, closing: 24, kind: 'head' },
  { id: 'o3', lane: 'oncoming', z0: 47, closing: 18, kind: 'head' },
  { id: 'o4', lane: 'oncoming', z0: 58, closing: 26, kind: 'head' },
  { id: 'a1', lane: 'ours', z0: 22, closing: 1.2, kind: 'tail' },
  { id: 'a2', lane: 'ours', z0: 40, closing: -0.8, kind: 'tail' },
];

/** The shuttle everyone is looking for: in our lane, holding its distance, bobbing a little. */
export function shuttleState(view, t) {
  const Z = (view.portrait ? 6 : 5.2) + Math.sin(t * 0.55) * 0.16;
  const X = LANE.ours + Math.sin(t * 0.37) * 0.05;
  const base = project(view, { Z, X });
  const width = 2.5 * view.unit * base.s;
  const height = 3.1 * view.unit * base.s;
  return {
    Z,
    X,
    x: base.x,
    groundY: base.groundY,
    width,
    height,
    left: base.x - width / 2,
    top: base.groundY - height,
    right: base.x + width / 2,
    bottom: base.groundY,
  };
}

/** Tiny deterministic random numbers, so the skyline is the same every time. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Buildings along the horizon: left edge, width and height, plus a few lit windows each. */
export function skyline(view, seed = 7) {
  const rand = mulberry32(seed);
  const maxHeight = view.height * (view.portrait ? 0.15 : 0.2);
  const buildings = [];
  let x = -20;
  while (x < view.width + 20) {
    const w = (view.portrait ? 18 : 26) + rand() * (view.portrait ? 34 : 60);
    const h = maxHeight * (0.18 + rand() * rand() * 0.9);
    const windows = [];
    const cols = Math.max(1, Math.floor(w / 9));
    const rows = Math.max(1, Math.floor(h / 11));
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        if (rand() < 0.22) windows.push({ c, r, warm: rand() < 0.7 });
      }
    }
    buildings.push({ x, w, h, cols, rows, windows });
    x += w + rand() * 6;
  }
  return buildings;
}

/** How far to fade something that is far away, 1 near the camera down to 0 at the haze. */
export function hazeAlpha(Z, far = Z_FAR) {
  return clamp(1 - (Z - 8) / (far - 8), 0, 1) ** 1.4;
}
