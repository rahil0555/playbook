/**
 * Fails if anything the browser downloads mentions the voice key, its variable names, or the voice provider.
 *
 * The browser is only ever meant to see clip URLs: a pre-generated file under /audio/edu, or /api/voice. The key,
 * the voice id and the provider's address all belong to the server. This is the gate that proves it, and it runs
 * over the real built output rather than over the source.
 *
 *     node scripts/check-bundle-secrets.mjs [dir=dist]
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] ?? 'dist');

/** Anything that would mean a secret, or the means to use one, reached the browser. */
const FORBIDDEN = [
  { pattern: /ELEVENLABS_API_KEY/i, why: 'the key variable name' },
  { pattern: /ELEVENLABS_VOICE_ID/i, why: 'the voice id variable name' },
  { pattern: /ELEVENLABS_MODEL_ID/i, why: 'the model variable name' },
  { pattern: /xi-api-key/i, why: "the provider's key header" },
  { pattern: /api\.elevenlabs\.io/i, why: "the provider's address (the browser must go through /api/voice)" },
  { pattern: /VITE_ELEVEN/i, why: 'a VITE_ variable, which Vite inlines into the bundle' },
  // a real ElevenLabs key is 32 hex characters, usually with this prefix; sk- covers a pasted key from elsewhere
  { pattern: /\bsk_[a-f0-9]{32,}\b/i, why: 'something shaped like an ElevenLabs key' },
  { pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/, why: 'something shaped like an API key' },
];

/** Files a browser can actually read. A source map counts: it carries the original source. */
const TEXTUAL = new Set(['.js', '.mjs', '.cjs', '.css', '.html', '.json', '.map', '.txt', '.svg', '.webmanifest']);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const found = [];
let scanned = 0;

try {
  await stat(ROOT);
} catch {
  console.error(`No built output at ${ROOT}. Run \`npm run build\` first.`);
  process.exit(1);
}

for await (const file of walk(ROOT)) {
  if (!TEXTUAL.has(path.extname(file).toLowerCase())) continue;
  scanned += 1;
  const text = await readFile(file, 'utf8');
  for (const { pattern, why } of FORBIDDEN) {
    const hit = text.match(pattern);
    if (hit) found.push(`${path.relative(process.cwd(), file)}: ${why} (${hit[0].slice(0, 24)})`);
  }
}

if (found.length) {
  console.error(`The built output leaks the voice secret:\n  ${found.join('\n  ')}`);
  process.exit(1);
}
console.log(`No key, key name or provider address in ${scanned} files under ${path.relative(process.cwd(), ROOT) || ROOT}.`);
