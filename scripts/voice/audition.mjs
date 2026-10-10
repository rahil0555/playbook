#!/usr/bin/env node
/**
 * PlayLab voice AUDITION generator (small, deliberate, human-in-the-loop).
 *
 * Generates ~10 representative phrases x a few candidate voices with OpenAI text-to-speech and writes a local
 * listening page. It does NOT touch the app, and it does NOT generate the full library.
 *
 * SAFETY
 *  - Dry run by default. Nothing is sent to the API unless you pass --yes.
 *  - The API key is read ONLY from the OPENAI_API_KEY environment variable, on this machine. It is never
 *    printed, written to disk, or added to the output page. Error text is redacted before it is shown.
 *  - Output goes to ./voice-audition/ which is git-ignored.
 *
 * Usage (see scripts/voice/README.md):
 *   node scripts/voice/audition.mjs                      # dry run: prints the plan and the cost estimate
 *   node --env-file=.env.local scripts/voice/audition.mjs --yes
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

export const MODEL = 'gpt-4o-mini-tts';
/** Candidate voices. Names come from third-party lists of OpenAI voices and are NOT verified here:
 *  the API rejects an unknown name and the script reports it. Personality is decided by listening. */
export const DEFAULT_VOICES = ['marin', 'coral', 'nova'];

export const PERSONA =
  'Voice: a playful, energetic cartoon teacher talking to young children who are learning letters and sounds. ' +
  'Accent: clear General American English. Tone: warm, upbeat, smiling and encouraging; lively but NOT exaggerated, ' +
  'never shouting or squealing. Pacing: a little slower than normal conversation, with very clear articulation and ' +
  'short natural pauses. Make every word easy for a small child to understand.';

const SOUND_RULE = (like) =>
  `Say ONLY the isolated speech sound, exactly as it is heard at the very start of the word "${like}". ` +
  'Do NOT say the name of the letter. Do not add extra words. Keep it short and clean; add a vowel only if the sound needs one.';

/** The audition set. group: name | sound | word | praise | sentence. */
export const PHRASES = [
  { id: 'name-a', group: 'name', text: 'ay', note: 'Letter A, said by its NAME', extra: 'Say the name of the letter A, as in the alphabet song.' },
  { id: 'name-b', group: 'name', text: 'bee', note: 'Letter B, by its name', extra: 'Say the name of the letter B, as in the alphabet song.' },
  { id: 'name-z', group: 'name', text: 'zee', note: 'Letter Z, by its name (American "zee")', extra: 'Say the name of the letter Z in American English ("zee").' },
  { id: 'sound-b', group: 'sound', text: 'buh', note: 'Isolated sound /b/ as in ball', extra: SOUND_RULE('ball') },
  { id: 'sound-s', group: 'sound', text: 'sss', note: 'Isolated sound /s/ as in sun (continuous)', extra: SOUND_RULE('sun') },
  { id: 'sound-m', group: 'sound', text: 'mmm', note: 'Isolated sound /m/ as in moon (continuous)', extra: SOUND_RULE('moon') },
  { id: 'sound-a', group: 'sound', text: 'aah', note: 'Isolated SHORT a /ă/ as in apple (hardest one)', extra: SOUND_RULE('apple') },
  { id: 'word-apple', group: 'word', text: 'apple', note: 'A simple word', extra: 'Say the single word clearly and happily.' },
  { id: 'praise-cat', group: 'praise', text: 'Great job! You spelled cat!', note: 'Child-friendly encouragement', extra: 'Sound genuinely delighted for the child, in a warm and natural way.' },
  { id: 'sentence-cat', group: 'sentence', text: 'The cat is sleeping.', note: 'A simple read-aloud sentence', extra: 'Read it gently and clearly, like a friendly teacher reading to a child.' },
];

/** Price assumptions for the ESTIMATE only. Unverified: taken from third-party pages; check OpenAI's pricing page. */
const EST = { usdPerAudioMinute: 0.015, charsPerSecond: 15, minSecondsPerClip: 1.2 };

export function estimate(phrases, voices) {
  const requests = phrases.length * voices.length;
  const chars = phrases.reduce((n, p) => n + p.text.length, 0) * voices.length;
  const seconds = phrases.reduce((n, p) => n + Math.max(EST.minSecondsPerClip, p.text.length / EST.charsPerSecond), 0) * voices.length;
  const usd = (seconds / 60) * EST.usdPerAudioMinute;
  return { requests, chars, seconds, usd, usdUpper: usd * 10 };
}

/** Remove anything that looks like a secret from text we are about to print. */
export function redact(text) {
  return String(text).replace(/sk-[A-Za-z0-9_-]{6,}/g, 'sk-[redacted]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
}

export function instructionsFor(phrase) {
  return `${PERSONA} ${phrase.extra ?? ''}`.trim();
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function listeningPage({ phrases, voices, failed = [] }) {
  const rows = phrases
    .map(
      (p) => `<tr><th scope="row"><strong>${esc(p.text)}</strong><br><small>${esc(p.group)}: ${esc(p.note)}</small></th>${voices
        .map((v) => (failed.includes(`${v}/${p.id}`) ? '<td>(failed)</td>' : `<td><audio controls preload="none" src="${esc(v)}/${esc(p.id)}.mp3"></audio></td>`))
        .join('')}</tr>`,
    )
    .join('\n');
  return `<!doctype html><meta charset="utf-8"><title>PlayLab voice audition</title>
<style>body{font:16px system-ui;margin:24px;max-width:1100px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top}th small{color:#555;font-weight:400}audio{width:230px}</style>
<h1>PlayLab voice audition</h1>
<p>Model: <code>${esc(MODEL)}</code>. Persona: ${esc(PERSONA)}</p>
<p>Listen for: clear American English, warm and playful (not over the top), easy for a small child to follow. Judge the isolated sounds separately; if they are not accurate, human recordings are recommended for those.</p>
<table><thead><tr><th>Phrase</th>${voices.map((v) => `<th>${esc(v)}</th>`).join('')}</tr></thead><tbody>
${rows}
</tbody></table>`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function synth({ text, voice, instructions, baseUrl, key, fetchImpl = fetch }) {
  const res = await fetchImpl(`${baseUrl}/audio/speech`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice, input: text, instructions, response_format: 'mp3' }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    const err = new Error(`HTTP ${res.status} ${redact(detail)}`);
    err.status = res.status;
    throw err;
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function run(argv = process.argv.slice(2), env = process.env, log = console.log) {
  const { values } = parseArgs({
    args: argv,
    options: {
      yes: { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      voices: { type: 'string' },
      only: { type: 'string' },
      out: { type: 'string', default: 'voice-audition' },
      'max-requests': { type: 'string', default: '40' },
    },
  });
  const voices = (values.voices ? values.voices.split(',') : DEFAULT_VOICES).map((v) => v.trim()).filter(Boolean);
  const only = values.only ? new Set(values.only.split(',')) : null;
  const phrases = PHRASES.filter((p) => !only || only.has(p.id));
  const cap = Number(values['max-requests']);
  const est = estimate(phrases, voices);

  log(`PlayLab voice audition: model ${MODEL}`);
  log(`  voices:   ${voices.join(', ')}`);
  log(`  phrases:  ${phrases.length} (${phrases.map((p) => p.id).join(', ')})`);
  log(`  requests: ${est.requests} (cap ${cap}), ${est.chars} characters of input in total`);
  log(`  estimated cost: about $${est.usd.toFixed(3)} (generous upper bound about $${est.usdUpper.toFixed(2)}).`);
  log('  (Estimate only: assumes ~$0.015 per audio minute from third-party sources; confirm on OpenAI\'s pricing page.)');
  log(`  output:   ./${values.out}/  (git-ignored)`);

  if (est.requests > cap) throw new Error(`Refusing: ${est.requests} requests exceeds --max-requests ${cap}.`);
  if (!values.yes) {
    log('\nDRY RUN: nothing was sent. Re-run with --yes to generate. The API key is read from OPENAI_API_KEY only.');
    return { dryRun: true, est };
  }
  const key = env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set in the environment (see scripts/voice/README.md). Nothing was sent.');
  const baseUrl = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

  await mkdir(values.out, { recursive: true });
  const failed = [];
  let made = 0;
  let skipped = 0;
  for (const voice of voices) {
    await mkdir(join(values.out, voice), { recursive: true });
    for (const p of phrases) {
      const file = join(values.out, voice, `${p.id}.mp3`);
      if (!values.force && (await exists(file))) {
        skipped++;
        continue;
      }
      try {
        await writeFile(file, await synth({ text: p.text, voice, instructions: instructionsFor(p), baseUrl, key }));
        made++;
        log(`  ok   ${voice}/${p.id}`);
      } catch (e) {
        failed.push(`${voice}/${p.id}`);
        log(`  FAIL ${voice}/${p.id}: ${redact(e.message)}`);
        if (e.status === 401 || e.status === 403) throw new Error('Authentication failed (check the key and billing). Stopping.');
      }
    }
  }
  await writeFile(join(values.out, 'index.html'), listeningPage({ phrases, voices, failed }));
  await writeFile(join(values.out, 'manifest.json'), JSON.stringify({ model: MODEL, voices, persona: PERSONA, phrases: phrases.map(({ id, group, text }) => ({ id, group, text })), failed, generatedAt: new Date().toISOString() }, null, 2));
  log(`\nDone: ${made} generated, ${skipped} skipped (already present), ${failed.length} failed. Open ${join(values.out, 'index.html')} in a browser to listen.`);
  return { dryRun: false, made, skipped, failed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => {
    console.error(`Error: ${redact(e.message)}`);
    process.exit(1);
  });
}
