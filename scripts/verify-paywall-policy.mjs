/**
 * Verifies the paywall POLICY as data, without a browser:
 *   1. the free-credit table is the product owner's numbers (12 letters / 12 sounds / 16 words / 4 sentences / 2 games)
 *   2. no page in the product can fall back to the browser's robotic speech synthesis
 *   3. the built bundle carries neither the ElevenLabs key, its name, nor the provider address
 *
 * Each result is printed as a named check so a requirement criterion can be linked to the check
 * that proves it. Nothing is invented: the numbers come from parsing the real policy source, and
 * the scans count real matches on disk.
 *
 * Usage:  node scripts/verify-paywall-policy.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const checks = [];
const add = (name, actual, expected) => checks.push({ name, actual, expected });

/** Read the free allowances straight out of the policy source. */
const credits = readFileSync('src/playlab/lib/credits.ts', 'utf8');
const table = {};
for (const [, id, free] of credits.matchAll(/['"]?([a-z-]+)['"]?:\s*\{\s*free:\s*(\d+)/g)) {
  table[id] = Number(free);
}
const expectedTable = { alphabet: 12, phonics: 12, 'word-builder': 16, sentences: 4, matching: 2 };
for (const [id, free] of Object.entries(expectedTable)) {
  add(`free allowance ${id} = ${free}`, table[id] ?? -1, free);
}

/** The demo price list: three tiers, an affordable entry point and a premium family tier. */
const pricing = readFileSync('src/playlab/lib/pricing.ts', 'utf8');
const currency = (pricing.match(/export const CURRENCY = '([^']+)'/) ?? [])[1] ?? '';
add('prices are shown in rupees', currency, '₹');
add('demo plans offered', (pricing.match(/id: '/g) ?? []).length, 3);
// The numbers as written, so a real price change is a deliberate edit of the check too.
const amounts = [...pricing.matchAll(/price: `\$\{CURRENCY\}([\d,]+)`/g)].map((m) => Number(m[1].replace(/,/g, '')));
add('cheapest plan is a middle-income monthly price (under 500)', Math.min(...amounts) < 500 ? 1 : 0, 1);
add('a premium family tier above 5000 exists', Math.max(...amounts) > 5000 ? 1 : 0, 1);

/** Every production source file, so the speech scan cannot miss one. */
function sources(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sources(path));
    else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(path)) && !/\.(test|spec)\.[jt]sx?$/.test(path)) out.push(path);
  }
  return out;
}

// Speech synthesis can only be an OUTPUT path if the source names it; a list of files that do is
// the honest measure, and the expected count is zero.
const files = sources('src');
const ttsFiles = files.filter((f) => /speechSynthesis|SpeechSynthesisUtterance/.test(readFileSync(f, 'utf8')));
add('sources that can speak with the browser voice', ttsFiles.length, 0);
if (ttsFiles.length) console.log(`browser-TTS files: ${ttsFiles.join(', ')}`);

/** The built bundle must not carry the credential or the provider address. */
if (existsSync('dist')) {
  const dist = sources('dist');
  const leaky = dist.filter((f) => /xi-api-key|ELEVENLABS|elevenlabs\.io/i.test(readFileSync(f, 'utf8')));
  add('built files carrying the key name or provider address', leaky.length, 0);
  if (leaky.length) console.log(`leaky bundle files: ${leaky.join(', ')}`);
} else {
  add('dist exists to scan', 0, 1);
}

console.log(JSON.stringify({ harnessVerification: { version: 1, checks } }));
const failed = checks.filter((c) => c.actual !== c.expected);
if (failed.length) process.exit(1);
