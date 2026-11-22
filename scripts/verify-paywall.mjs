/**
 * Verifies the usage paywall in a REAL browser and reports what Playwright itself observed.
 *
 * The check names printed here are the test titles of e2e/paywall-genuine-play.spec.ts, so a
 * requirement criterion can be linked to the exact test that proves it. No value is invented:
 * pass/fail comes from Playwright's own JSON report.
 *
 * Playwright starts the built preview on :4173 by itself (see playwright.config.ts webServer).
 * Usage:  node scripts/verify-paywall.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';

const SPEC = 'e2e/paywall-genuine-play.spec.ts';
const OUT = './.paywall-report.json';
rmSync(OUT, { force: true });

let exitCode = 0;
try {
  execFileSync(
    'npx',
    ['playwright', 'test', SPEC, '--project=chromium', '--reporter=json', '--workers=1'],
    {
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: OUT },
      shell: true,
    },
  );
} catch {
  exitCode = 1; // a failing test is reported through the checks below, not by escaping
}

const report = JSON.parse(readFileSync(OUT, 'utf8'));

const specs = [];
const walk = (suite) => {
  for (const s of suite.specs ?? []) specs.push(s);
  for (const child of suite.suites ?? []) walk(child);
};
for (const s of report.suites ?? []) walk(s);

if (specs.length === 0) {
  // Never hide a harness-level failure behind "0 checks": say what actually went wrong.
  const why = (report.errors ?? []).map((e) => e.message ?? String(e)).join(' | ') || 'no specs and no error reported';
  console.log(JSON.stringify({ harnessVerification: { version: 1, checks: [{ name: 'paywall genuine-play browser spec runs', actual: 0, expected: 1 }] } }));
  console.log(`PLAYWRIGHT COULD NOT RUN THE SPEC: ${why.slice(0, 800)}`);
  rmSync(OUT, { force: true });
  process.exit(1);
}

const checks = specs.map((s) => ({ name: s.title, actual: s.ok ? 1 : 0, expected: 1 }));
checks.push({
  name: 'no browser error during the genuine-play paywall flows',
  actual: specs.filter((s) => !s.ok).length,
  expected: 0,
});

console.log(JSON.stringify({ harnessVerification: { version: 1, checks } }));
if (exitCode) console.log(`playwright reported failures (exit ${exitCode})`);
rmSync(OUT, { force: true });
