#!/usr/bin/env node
/**
 * check-docs.mjs — documentation staleness check.
 *
 * Warns (does not block, by default) when code changed but the docs that describe it
 * did not. Wired to .githooks/pre-push; also runnable by hand:
 *
 *   node scripts/check-docs.mjs                 # check unpushed commits vs upstream
 *   node scripts/check-docs.mjs --staged        # check staged changes
 *   node scripts/check-docs.mjs --range A..B    # check an explicit git range
 *   node scripts/check-docs.mjs --strict        # exit 1 on findings (block the push)
 *
 * Rules:
 *  1. src/ changed            → docs/CHANGES.md must have an entry in the same range.
 *  2. a module's code changed → that module's docs/modules/<NAME>.md should change too.
 *  3. tests changed           → docs/TESTING_GUIDE.md should change too.
 *
 * Keep the MODULES map in sync when you add a module doc.
 */

import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const staged = args.includes('--staged');
const rangeArg = args.find((a) => a.startsWith('--range'));

function git(...a) {
  try {
    return execFileSync('git', a, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

/** Path globs that belong to each module doc. A file may match several. */
const MODULES = [
  { doc: 'docs/modules/AUTH.md', label: 'auth', match: [
    /LoginPage/, /ForgotPassword/, /^src\/lib\/authSession/, /^src\/hooks\/use-refresh/,
    /^src\/components\/auth\//,
  ]},
  { doc: 'docs/modules/DASHBOARD.md', label: 'dashboard', match: [
    /DashboardPage/, /ManagerDashboardPage/, /^src\/hooks\/use-dashboard/,
  ]},
  { doc: 'docs/modules/ACCOUNTS.md', label: 'accounts', match: [
    /ManagersPage/, /ManagerAccountsPage/, /^src\/hooks\/use-managers/,
  ]},
  { doc: 'docs/modules/BUSES.md', label: 'buses', match: [
    /ManagerBusesPage/, /^src\/hooks\/use-buses/,
  ]},
  { doc: 'docs/modules/ROUTES.md', label: 'routes', match: [
    /RoutesPage/, /^src\/hooks\/use-system-routes/,
  ]},
  { doc: 'docs/modules/TRACKING.md', label: 'tracking', match: [
    /ManagerTrackingPage/, /^src\/hooks\/use-tracking/, /^src\/lib\/(polyline|map-tokens)\./,
  ]},
  { doc: 'docs/modules/OPERATIONS.md', label: 'operations', match: [
    /OperationsPage/, /^src\/hooks\/use-operations/,
  ]},
  { doc: 'docs/modules/SETTINGS.md', label: 'settings', match: [
    /ManagerSettingsPage/, /SettingsPage/,
  ]},
];

function changedFiles() {
  if (staged) return git('diff', '--cached', '--name-only').split('\n').filter(Boolean);
  if (rangeArg) {
    const range = rangeArg.includes('=') ? rangeArg.split('=')[1] : args[args.indexOf(rangeArg) + 1];
    return git('diff', '--name-only', range).split('\n').filter(Boolean);
  }
  // Default: everything not yet on the upstream branch.
  const upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
  if (upstream) return git('diff', '--name-only', `${upstream}...HEAD`).split('\n').filter(Boolean);
  // No upstream (new branch): fall back to the last commit.
  return git('diff', '--name-only', 'HEAD~1...HEAD').split('\n').filter(Boolean);
}

const files = changedFiles();
if (files.length === 0) process.exit(0);

const touched = (re) => files.some((f) => re.test(f));
const changedDoc = (doc) => files.includes(doc);

const srcChanged = files.some((f) => f.startsWith('src/'));
const findings = [];

// Rule 1 — session log
if (srcChanged && !changedDoc('docs/CHANGES.md')) {
  findings.push(
    'docs/CHANGES.md has no entry for this change.\n' +
    '     Add one (template at the top of the file) so the session is on the record.'
  );
}

// Rule 2 — module docs
for (const m of MODULES) {
  const hit = files.find((f) => f.startsWith('src/') || f.startsWith('scripts/')
    ? m.match.some((re) => re.test(f)) : false);
  if (hit && !changedDoc(m.doc)) {
    findings.push(
      `${m.label}: changed ${hit}\n` +
      `     but ${m.doc} was not updated. Refresh its Key files / Contracts / Status.`
    );
  }
}

// Rule 3 — testing guide
if (touched(/__tests__|\.test\.|\.spec\.|^\.maestro\//) && !changedDoc('docs/TESTING_GUIDE.md')) {
  findings.push(
    'tests changed but docs/TESTING_GUIDE.md was not updated.\n' +
    '     Every test needs a traceability row.'
  );
}

if (findings.length === 0) {
  console.log('✓ check-docs: docs look in sync with the code.');
  process.exit(0);
}

const bar = '─'.repeat(68);
console.error(`\n${bar}\n  DOCS CHECK — ${findings.length} thing(s) to look at\n${bar}`);
findings.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
console.error(
  `${bar}\n` +
  `  Guides: docs/guides/ADDING_A_FEATURE.md · ADDING_A_TEST.md\n` +
  (strict
    ? '  --strict is on: push blocked.\n'
    : '  This is a warning, not a block. Push proceeding.\n') +
  `${bar}\n`
);
process.exit(strict ? 1 : 0);
