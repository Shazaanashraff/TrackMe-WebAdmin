import { describe, it, expect } from 'vitest';
import {
  CARS,
  LANE,
  SPEED,
  Z_FAR,
  Z_NEAR,
  carZ,
  hazeAlpha,
  makeView,
  mulberry32,
  project,
  shuttleState,
  skyline,
  streamZs,
  wrapZ,
} from '../roadScene';

const SCREENS = [
  [1920, 1080],
  [1440, 900],
  [820, 1100],
  [390, 844],
  [360, 640],
];

describe('makeView', () => {
  it('puts the vanishing point right of centre on a wide screen, so the headline owns the left', () => {
    const v = makeView(1440, 900);
    expect(v.portrait).toBe(false);
    expect(v.vpx).toBeGreaterThan(1440 / 2);
    expect(v.horizon).toBeGreaterThan(900 * 0.3);
    expect(v.horizon).toBeLessThan(900 * 0.6);
  });

  it('centres the road and raises the horizon on a phone', () => {
    const v = makeView(390, 844);
    expect(v.portrait).toBe(true);
    expect(v.vpx).toBe(195);
    expect(v.horizon).toBeLessThan(844 * 0.35);
  });

  it('scales the world with the screen, but never to nothing', () => {
    expect(makeView(1920, 1080).unit).toBeGreaterThan(makeView(1280, 720).unit);
    expect(makeView(320, 568).unit).toBeGreaterThan(50);
  });
});

describe('project', () => {
  const view = makeView(1440, 900);

  it('puts something at the camera on the bottom edge, at full scale', () => {
    const p = project(view, { Z: 1 });
    expect(p.s).toBe(1);
    expect(p.groundY).toBeCloseTo(900);
  });

  it('shrinks and rises towards the horizon with distance', () => {
    const ys = [1, 2, 4, 8, 16, 64].map((Z) => project(view, { Z }).groundY);
    expect(ys).toEqual([...ys].sort((a, b) => b - a));
    expect(project(view, { Z: 1e6 }).groundY).toBeCloseTo(view.horizon, 0);
  });

  it('pulls sideways offsets in towards the vanishing point with distance', () => {
    const near = Math.abs(project(view, { Z: 2, X: -3 }).x - view.vpx);
    const far = Math.abs(project(view, { Z: 20, X: -3 }).x - view.vpx);
    expect(far).toBeLessThan(near);
  });

  it('puts left of the vanishing point for negative X and right for positive', () => {
    expect(project(view, { Z: 5, X: -1 }).x).toBeLessThan(view.vpx);
    expect(project(view, { Z: 5, X: 1 }).x).toBeGreaterThan(view.vpx);
  });

  it('draws taller things higher on screen', () => {
    expect(project(view, { Z: 5, height: 3 }).y).toBeLessThan(project(view, { Z: 5, height: 1 }).y);
  });
});

describe('wrapZ', () => {
  it('leaves an in-range depth alone', () => {
    expect(wrapZ(10)).toBeCloseTo(10);
  });

  it('loops anything out of range back into [near, far)', () => {
    [-500, -1, 0, 0.1, Z_FAR, Z_FAR + 3, 9999].forEach((z) => {
      const w = wrapZ(z);
      expect(w).toBeGreaterThanOrEqual(Z_NEAR);
      expect(w).toBeLessThan(Z_FAR);
    });
  });
});

describe('streamZs', () => {
  it('only returns depths on the road', () => {
    [0, 0.7, 3.3, 41].forEach((t) => {
      streamZs(t, 5.5).forEach((z) => {
        expect(z).toBeGreaterThanOrEqual(Z_NEAR);
        expect(z).toBeLessThan(Z_FAR);
      });
    });
  });

  it('keeps an even spacing', () => {
    const zs = streamZs(1.3, 6);
    zs.slice(1).forEach((z, i) => expect(z - zs[i]).toBeCloseTo(6));
  });

  it('streams towards the camera as time passes: every lamp moves in by speed x time', () => {
    const dt = 0.2;
    const before = streamZs(0, 6);
    const after = streamZs(dt, 6);
    // Compare the same physical lamps (the nearest one may have passed the camera).
    before
      .map((z) => z - dt * SPEED)
      .filter((z) => z >= Z_NEAR)
      .forEach((expected) => {
        expect(after.some((z) => Math.abs(z - expected) < 1e-9)).toBe(true);
      });
  });

  it('repeats exactly after one spacing, so the loop has no seam', () => {
    const spacing = 6;
    const a = streamZs(0, spacing).map((z) => +z.toFixed(6));
    const b = streamZs(spacing / SPEED, spacing).map((z) => +z.toFixed(6));
    expect(b).toEqual(a);
  });
});

describe('carZ', () => {
  it('brings an oncoming car towards the camera, then recycles it far away', () => {
    const car = { z0: 20, closing: 20 };
    expect(carZ(car, 0.2)).toBeLessThan(carZ(car, 0));
    const wrapped = carZ(car, (20 - Z_NEAR) / 20 + 0.05);
    expect(wrapped).toBeGreaterThan(Z_FAR - 10);
  });

  it('lets a slower car in our lane creep up only slowly', () => {
    const slow = { z0: 22, closing: 1.2 };
    expect(22 - carZ(slow, 5)).toBeCloseTo(6);
  });

  it('is deterministic', () => {
    expect(carZ(CARS[0], 3.7)).toBe(carZ(CARS[0], 3.7));
  });
});

describe('CARS', () => {
  it('are uniquely named and in a real lane', () => {
    expect(new Set(CARS.map((c) => c.id)).size).toBe(CARS.length);
    CARS.forEach((c) => expect(Object.keys(LANE)).toContain(c.lane));
  });
});

describe('shuttleState', () => {
  it.each(SCREENS)('sits fully on screen with room for its tag at %ix%i', (w, h) => {
    const v = makeView(w, h);
    for (const t of [0, 1.3, 2.9, 7]) {
      const bus = shuttleState(v, t);
      expect(bus.left).toBeGreaterThan(0);
      expect(bus.top).toBeGreaterThan(0);
      expect(bus.bottom).toBeLessThan(h);
      // The tag sits to its right and needs roughly 120px.
      expect(bus.right + 120).toBeLessThan(w);
      expect(bus.width).toBeGreaterThan(30);
    }
  });

  it('holds its distance and only bobs a little', () => {
    const v = makeView(1440, 900);
    const sizes = [0, 1, 2, 3, 4, 5, 6].map((t) => shuttleState(v, t).width);
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeLessThan(1.15);
  });

  it('stays in our lane, left of the vanishing point', () => {
    const v = makeView(1440, 900);
    expect(shuttleState(v, 2).x).toBeLessThan(v.vpx);
  });

  it('sits above the headline block on a phone (it starts around 40% down)', () => {
    const v = makeView(390, 844);
    expect(shuttleState(v, 1).bottom).toBeLessThan(844 * 0.42);
  });
});

describe('skyline', () => {
  const view = makeView(1440, 900);

  it('is the same every time for the same seed, and different for another', () => {
    expect(skyline(view, 7)).toEqual(skyline(view, 7));
    expect(skyline(view, 7)).not.toEqual(skyline(view, 8));
  });

  it('spans the whole width without gaps wider than a few pixels', () => {
    const b = skyline(view);
    expect(b[0].x).toBeLessThanOrEqual(0);
    const last = b[b.length - 1];
    expect(last.x + last.w).toBeGreaterThanOrEqual(1440);
    b.slice(1).forEach((x, i) => expect(x.x - (b[i].x + b[i].w)).toBeLessThan(8));
  });

  it('keeps every building below the tallest allowed', () => {
    const max = 900 * 0.2;
    skyline(view).forEach((b) => expect(b.h).toBeLessThanOrEqual(max));
  });

  it('only lights windows inside the building', () => {
    skyline(view).forEach((b) => b.windows.forEach((w) => {
      expect(w.c).toBeLessThan(b.cols);
      expect(w.r).toBeLessThan(b.rows);
    }));
  });
});

describe('mulberry32', () => {
  it('returns repeatable numbers in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 20; i += 1) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hazeAlpha', () => {
  it('is fully clear near the camera and gone at the far limit', () => {
    expect(hazeAlpha(2)).toBe(1);
    expect(hazeAlpha(Z_FAR)).toBe(0);
  });

  it('only ever fades with distance', () => {
    const a = [4, 10, 20, 40, 60].map((z) => hazeAlpha(z));
    expect(a).toEqual([...a].sort((x, y) => y - x));
  });
});
