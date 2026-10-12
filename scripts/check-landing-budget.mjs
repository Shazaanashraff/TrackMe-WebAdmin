// Fails if the landing page's JavaScript has grown past its budget.
//
// The landing page ships GSAP, ScrollTrigger and Lenis, which is most of its weight, and
// every scroll-driven scene added later makes it heavier. Visitors arrive on phones and
// slow connections, so the size is a feature we protect on purpose.
//
//   npm run build && npm run check:landing-budget
//
// Raise LIMIT_KB deliberately, in a commit that says why, never to make a failure go away.

import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const LIMIT_KB = 120; // gzipped, for the lazy landing chunk
const DIR = 'dist/assets';

let files;
try {
  files = readdirSync(DIR);
} catch {
  console.error(`landing budget: ${DIR} not found. Run "npm run build" first.`);
  process.exit(2);
}

const chunks = files.filter((name) => /^LandingPage-.*\.js$/.test(name));
if (chunks.length === 0) {
  console.error('landing budget: no LandingPage-*.js chunk found in the build.');
  process.exit(2);
}

const bytes = chunks.reduce((sum, name) => sum + gzipSync(readFileSync(join(DIR, name))).length, 0);
const kb = bytes / 1024;
const verdict = kb <= LIMIT_KB ? 'OK' : 'OVER BUDGET';

console.log(`landing budget: ${kb.toFixed(1)} KB gzipped of ${LIMIT_KB} KB allowed (${verdict})`);
console.log(`  chunks: ${chunks.join(', ')}`);
process.exit(kb <= LIMIT_KB ? 0 : 1);
