import { useEffect, useRef } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  CARS,
  LANE,
  ROAD_HALF_WIDTH,
  Z_FAR,
  carZ,
  hazeAlpha,
  makeView,
  project,
  shuttleState,
  skyline,
  streamZs,
} from './roadScene';

const TEAL = '94,234,212';
const BONE = '239,234,223';
const WARM = '255,232,176';
const TAIL = '255,84,70';

// A frame that reads well on its own, used when motion is switched off.
const STILL_TIME = 2.4;

/** Everything behind the road: sky, horizon glow, skyline. Drawn once per resize. */
function paintBackdrop(ctx, view) {
  const { width, height, horizon } = view;

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#03080a');
  sky.addColorStop(0.65, '#06201e');
  sky.addColorStop(1, '#0e3a36');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon + 1);

  const ground = ctx.createLinearGradient(0, horizon, 0, height);
  ground.addColorStop(0, '#0a2927');
  ground.addColorStop(0.3, '#05100f');
  ground.addColorStop(1, '#030807');
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, width, height - horizon);

  const glow = ctx.createRadialGradient(view.vpx, horizon, 0, view.vpx, horizon, width * 0.6);
  glow.addColorStop(0, `rgba(${TEAL},0.34)`);
  glow.addColorStop(0.4, `rgba(${TEAL},0.1)`);
  glow.addColorStop(1, `rgba(${TEAL},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, horizon + 1);

  const buildings = skyline(view);
  buildings.forEach((b) => {
    const top = horizon - b.h;
    ctx.fillStyle = '#05100f';
    ctx.fillRect(b.x, top, b.w, b.h + 1);
    b.windows.forEach((w) => {
      ctx.fillStyle = w.warm ? `rgba(${WARM},0.55)` : `rgba(${TEAL},0.5)`;
      ctx.fillRect(b.x + 4 + w.c * 9, top + 5 + w.r * 11, 3, 4);
    });
  });

  // Haze: buildings dissolve into the horizon glow.
  const haze = ctx.createLinearGradient(0, horizon - height * 0.22, 0, horizon);
  haze.addColorStop(0, 'rgba(14,58,54,0)');
  haze.addColorStop(1, 'rgba(14,58,54,0.7)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - height * 0.22, width, height * 0.22);
}

function quad(ctx, view, x0, x1, z0, z1) {
  const a = project(view, { Z: z0, X: x0 });
  const b = project(view, { Z: z0, X: x1 });
  const c = project(view, { Z: z1, X: x1 });
  const d = project(view, { Z: z1, X: x0 });
  ctx.beginPath();
  ctx.moveTo(a.x, a.groundY);
  ctx.lineTo(b.x, b.groundY);
  ctx.lineTo(c.x, c.groundY);
  ctx.lineTo(d.x, d.groundY);
  ctx.closePath();
}

function glow(ctx, x, y, radius, rgb, alpha) {
  if (alpha <= 0.01 || radius < 0.5) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.35, `rgba(${rgb},${alpha * 0.35})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function paintRoad(ctx, view, t) {
  const near = 0.55;

  // The tarmac.
  const road = ctx.createLinearGradient(0, view.horizon, 0, view.height);
  road.addColorStop(0, '#1e5b55');
  road.addColorStop(0.1, '#123431');
  road.addColorStop(0.45, '#0a1d1b');
  road.addColorStop(1, '#050d0c');
  ctx.fillStyle = road;
  quad(ctx, view, -ROAD_HALF_WIDTH, ROAD_HALF_WIDTH, Z_FAR, near);
  ctx.fill();

  // Edge lines, fading into the distance.
  [-1, 1].forEach((side) => {
    const x = side * (ROAD_HALF_WIDTH - 0.3);
    const g = ctx.createLinearGradient(0, view.horizon, 0, view.height);
    g.addColorStop(0, `rgba(${BONE},0)`);
    g.addColorStop(1, `rgba(${BONE},0.34)`);
    ctx.fillStyle = g;
    quad(ctx, view, x - 0.07, x + 0.07, Z_FAR, near);
    ctx.fill();
  });

  // The centre line, streaming towards the camera.
  streamZs(t, 5.5).forEach((z) => {
    const alpha = (0.08 + 0.6 * hazeAlpha(z)) * (view.portrait ? 0.45 : 1);
    ctx.fillStyle = `rgba(${BONE},${alpha})`;
    quad(ctx, view, -0.07, 0.07, z, z + 2.3);
    ctx.fill();
  });

  // Fog where the road meets the skyline, so there is no hard seam.
  const fog = ctx.createLinearGradient(0, view.horizon - 4, 0, view.horizon + view.height * 0.14);
  fog.addColorStop(0, `rgba(14,58,54,0.65)`);
  fog.addColorStop(1, `rgba(14,58,54,0)`);
  ctx.fillStyle = fog;
  ctx.fillRect(0, view.horizon - 4, view.width, view.height * 0.14 + 4);
}

function paintLamps(ctx, view, t) {
  ctx.globalCompositeOperation = 'lighter';
  [-1, 1].forEach((side) => {
    const zs = streamZs(t + (side > 0 ? 0.5 : 0), 9).reverse(); // far to near
    zs.forEach((z) => {
      // Fade in from the camera so a lamp flying past never flashes a huge blur.
      const alpha = hazeAlpha(z) * Math.min(1, Math.max(0, (z - 2) / 5));
      if (alpha <= 0.02) return;
      const X = side * 4.3;
      const foot = project(view, { Z: z, X });
      const head = project(view, { Z: z, X: side * 3.1, height: 4.4 });

      ctx.strokeStyle = `rgba(150,185,178,${0.45 * alpha})`;
      ctx.lineWidth = Math.max(0.6, view.unit * foot.s * 0.07);
      ctx.beginPath();
      ctx.moveTo(foot.x, foot.groundY);
      ctx.lineTo(foot.x, head.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();

      glow(ctx, head.x, head.y, Math.min(view.height * 0.1, Math.max(3, view.unit * head.s * 1.25)), WARM, 0.75 * alpha);

      // The pool of light it drops on the road.
      const pool = project(view, { Z: z, X: side * 1.9 });
      ctx.save();
      ctx.translate(pool.x, pool.groundY);
      ctx.scale(1, 0.18);
      glow(ctx, 0, 0, Math.min(view.width * 0.18, view.unit * pool.s * 2.3), WARM, 0.22 * alpha);
      ctx.restore();
    });
  });
  ctx.globalCompositeOperation = 'source-over';
}

function paintTraffic(ctx, view, t) {
  const sorted = CARS.map((car) => ({ car, z: carZ(car, t) })).sort((a, b) => b.z - a.z);

  sorted.forEach(({ car, z }) => {
    const alpha = hazeAlpha(z);
    if (alpha <= 0.02) return;
    const X = LANE[car.lane];
    const body = project(view, { Z: z, X });

    // A soft dark silhouette, so passing lamps and dashes dim behind it. Skipped right
    // at the camera, where a flat shape would read as a black box.
    if (z > 3.5 && z < 30) {
      const w = 1.9 * view.unit * body.s;
      const h = 1.25 * view.unit * body.s;
      const nearFade = Math.min(1, (z - 3.5) / 3);
      ctx.fillStyle = `rgba(3,9,9,${0.7 * alpha * nearFade})`;
      roundedRect(ctx, body.x - w / 2, body.groundY - h, w, h, w * 0.18);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'lighter';
    const isHead = car.kind === 'head';
    const rgb = isHead ? WARM : TAIL;
    const lampHeight = isHead ? 0.55 : 0.7;
    [-0.55, 0.55].forEach((dx) => {
      const p = project(view, { Z: z, X: X + dx, height: lampHeight });
      const r = Math.max(2.2, view.unit * p.s * (isHead ? 0.7 : 0.45));
      glow(ctx, p.x, p.y, r, rgb, (isHead ? 0.95 : 0.8) * alpha);

      if (isHead) {
        // The streak it leaves behind as it rushes past.
        const tail = project(view, { Z: z + 3.4, X: X + dx, height: lampHeight });
        const g = ctx.createLinearGradient(p.x, p.y, tail.x, tail.y);
        g.addColorStop(0, `rgba(${rgb},${0.55 * alpha})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = Math.max(1, view.unit * p.s * 0.14);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(tail.x, tail.y);
        ctx.stroke();
      }
    });
    ctx.globalCompositeOperation = 'source-over';
  });
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintShuttle(ctx, view, t) {
  const bus = shuttleState(view, t);
  const { left, top, width, height, groundY, x } = bus;
  const bottom = groundY;

  // Shadow on the tarmac.
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(1, 0.12);
  glow(ctx, 0, 0, width * 0.85, '0,0,0', 0.7);
  ctx.restore();

  // Body.
  const body = ctx.createLinearGradient(0, top, 0, bottom);
  body.addColorStop(0, '#194541');
  body.addColorStop(0.5, '#0d2926');
  body.addColorStop(1, '#071413');
  ctx.fillStyle = body;
  roundedRect(ctx, left, top, width, height * 0.92, width * 0.07);
  ctx.fill();

  // Rear window.
  const win = ctx.createLinearGradient(0, top + height * 0.14, 0, top + height * 0.46);
  win.addColorStop(0, `rgba(${TEAL},0.34)`);
  win.addColorStop(1, `rgba(${TEAL},0.07)`);
  ctx.fillStyle = win;
  roundedRect(ctx, left + width * 0.1, top + height * 0.14, width * 0.8, height * 0.32, width * 0.03);
  ctx.fill();
  ctx.fillStyle = 'rgba(3,9,9,0.55)';
  ctx.fillRect(x - width * 0.008, top + height * 0.14, width * 0.016, height * 0.32);

  // The headlights of whatever is behind catch the lower half.
  const spill = ctx.createLinearGradient(0, top + height * 0.5, 0, bottom);
  spill.addColorStop(0, `rgba(${WARM},0)`);
  spill.addColorStop(1, `rgba(${WARM},0.1)`);
  ctx.fillStyle = spill;
  ctx.fillRect(left, top + height * 0.5, width, height * 0.42);

  // Bumper and wheels.
  ctx.fillStyle = '#030909';
  ctx.fillRect(left + width * 0.04, bottom - height * 0.2, width * 0.92, height * 0.1);
  ctx.fillRect(left + width * 0.08, bottom - height * 0.1, width * 0.16, height * 0.1);
  ctx.fillRect(left + width * 0.76, bottom - height * 0.1, width * 0.16, height * 0.1);

  ctx.globalCompositeOperation = 'lighter';

  // Destination board, glowing teal.
  const boardW = width * 0.42;
  const boardH = height * 0.07;
  glow(ctx, x, top + height * 0.075, width * 0.55, TEAL, 0.5);
  ctx.fillStyle = `rgba(${TEAL},0.95)`;
  roundedRect(ctx, x - boardW / 2, top + height * 0.04, boardW, boardH, boardH * 0.3);
  ctx.fill();

  // Tail lights.
  const tailY = top + height * 0.62;
  [left + width * 0.07, left + width * 0.83].forEach((tx) => {
    glow(ctx, tx + width * 0.05, tailY + height * 0.06, width * 0.34, TAIL, 0.75);
    ctx.fillStyle = `rgba(${TAIL},0.95)`;
    ctx.fillRect(tx, tailY, width * 0.1, height * 0.12);
  });

  // A string of amber clearance lights across the roof.
  for (let i = 0; i < 5; i += 1) {
    const cx = left + width * (0.2 + i * 0.15);
    glow(ctx, cx, top + height * 0.02, Math.max(2, width * 0.04), '255,196,92', 0.8);
  }
  ctx.globalCompositeOperation = 'source-over';

  return bus;
}

/** The tracking reticle that locks onto the shuttle: the hero's question, answered. */
function paintReticle(ctx, view, t, bus) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
  const pad = Math.max(8, bus.width * 0.16) + pulse * 3;
  const arm = Math.max(10, bus.width * 0.24);
  const l = bus.left - pad;
  const r = bus.right + pad;
  const tp = bus.top - pad;
  const b = bus.bottom + pad * 0.4;

  ctx.strokeStyle = `rgba(${TEAL},0.95)`;
  ctx.lineWidth = Math.max(1.4, bus.width * 0.012);
  ctx.lineCap = 'round';
  ctx.beginPath();
  [[l, tp, 1, 1], [r, tp, -1, 1], [l, b, 1, -1], [r, b, -1, -1]].forEach(([cx, cy, dx, dy]) => {
    ctx.moveTo(cx + dx * arm, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * arm);
  });
  ctx.stroke();

  // A ping that spreads out from the shuttle once every couple of seconds.
  const phase = (t * 0.5) % 1;
  ctx.strokeStyle = `rgba(${TEAL},${0.5 * (1 - phase)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(bus.x, bus.bottom - bus.height * 0.45, bus.width * (0.6 + phase * 0.9), bus.height * (0.6 + phase * 0.9), 0, 0, Math.PI * 2);
  ctx.stroke();

  // The tag.
  const fs = Math.max(10, Math.min(13, bus.width * 0.1));
  ctx.font = `500 ${fs}px "Fira Code", ui-monospace, monospace`;
  ctx.textBaseline = 'alphabetic';
  const tx = r + 10;
  const ty = tp + fs;
  ctx.strokeStyle = `rgba(${TEAL},0.6)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r, tp);
  ctx.lineTo(tx - 4, ty - fs * 0.4);
  ctx.stroke();
  ctx.fillStyle = `rgba(${BONE},0.95)`;
  ctx.fillText('SHUTTLE A', tx, ty);
  ctx.fillStyle = `rgba(${TEAL},0.95)`;
  ctx.fillText('● LIVE', tx, ty + fs * 1.5);
}

function paintScene(ctx, view, backdrop, t) {
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.drawImage(backdrop, 0, 0, view.width, view.height);
  paintRoad(ctx, view, t);
  paintLamps(ctx, view, t);
  paintTraffic(ctx, view, t);
  const bus = paintShuttle(ctx, view, t);
  paintReticle(ctx, view, t, bus);
}

/**
 * The hero's moving picture: a night road drawn live on a canvas, with a
 * shuttle up ahead and a tracking reticle locked onto it. Original artwork, a
 * few kilobytes of code, sharp at any size. Pauses when off screen or when the
 * tab is hidden, and holds a single still frame for people who prefer reduced
 * motion.
 */
export function NightRoad({ className }) {
  const canvasRef = useRef(null);
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.('2d');
    if (!canvas || !ctx) return undefined;

    const backdrop = document.createElement('canvas');
    const bctx = backdrop.getContext('2d');
    if (!bctx) return undefined;

    let view = null;
    let frame = 0;
    let visible = true;
    const startedAt = performance.now();

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = canvas;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.25 : 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      backdrop.width = canvas.width;
      backdrop.height = canvas.height;
      view = makeView(width, height);
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintBackdrop(bctx, view);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) paintScene(ctx, view, backdrop, STILL_TIME);
    };

    const tick = (now) => {
      frame = 0;
      if (!view) {
        resize();
      }
      if (view && visible && !document.hidden) {
        paintScene(ctx, view, backdrop, (now - startedAt) / 1000);
      }
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!reduce && !frame) frame = requestAnimationFrame(tick);
    };

    resize();
    const resizer = new ResizeObserver(resize);
    resizer.observe(canvas);

    const watcher = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
      });
    watcher?.observe(canvas);

    const onVisibility = () => { if (!document.hidden) start(); };
    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizer.disconnect();
      watcher?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduce]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}

