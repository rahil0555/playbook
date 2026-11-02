/**
 * Pre-generate every fixed line in Edu's ElevenLabs voice.
 *
 * Run it on YOUR machine, with YOUR key, and commit what it writes:
 *
 *     ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... npx vite-node scripts/generate-voice.ts
 *
 * It writes one mp3 per line into `public/audio/edu/`, plus `manifest.json` mapping each line to its file.
 * The app loads that manifest and plays the clips, which is instant, costs nothing per play and works offline.
 *
 * The key is read from the environment and used only to talk to ElevenLabs. It is never written into the manifest,
 * into a file name or into anything the browser downloads.
 *
 * Safe to re-run: a line whose file already exists is skipped, so a re-run only generates what is new. `--force`
 * regenerates everything (use it after changing the voice), `--dry-run` reports what would be generated and spends
 * nothing, and `--limit N` generates only the first N missing lines.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { allVoiceLines, voiceKey, type VoiceLine } from '../src/playlab/audio/voiceLines';
import type { VoiceManifest } from '../src/playlab/services/eduVoice';

const OUT_DIR = path.join(process.cwd(), 'public', 'audio', 'edu');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
/** Pause between requests, so a long run does not trip the provider's rate limit. */
const GAP_MS = 250;

/** The file a line is stored as. The hash is of the line and the voice, so changing voice changes every file. */
const fileFor = (text: string, voiceId: string) => `${createHash('sha256').update(`${voiceId}\n${voiceKey(text)}`).digest('hex').slice(0, 16)}.mp3`;

const flag = (name: string) => process.argv.includes(`--${name}`);
const value = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
};

async function speakOne(text: string, apiKey: string, voiceId: string, modelId: string): Promise<Uint8Array> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: modelId,
      // the same settings the server function uses, so a pre-generated line and a dynamic one sound alike
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    const detail = res.status === 401 ? 'the key was refused' : res.status === 429 ? 'rate limited' : `HTTP ${res.status}`;
    throw new Error(`ElevenLabs refused "${text.slice(0, 40)}": ${detail}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

async function main() {
  const dryRun = flag('dry-run');
  const force = flag('force');
  const limit = Number(value('limit') ?? Number.POSITIVE_INFINITY);
  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? '';
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

  const lines: VoiceLine[] = allVoiceLines();
  const characters = lines.reduce((n, l) => n + l.text.length, 0);

  if (!dryRun && (!apiKey || !voiceId)) {
    console.error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID first (see .env.example), or pass --dry-run.');
    process.exitCode = 1;
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const existing = new Set((await readdir(OUT_DIR).catch(() => [] as string[])).filter((f) => f.endsWith('.mp3')));

  // a dry run has no voice id, so it reports on the lines rather than on the files they would become
  const planned = lines.map((line) => ({ ...line, file: voiceId ? fileFor(line.text, voiceId) : '' }));
  const missing = planned.filter((l) => force || !l.file || !existing.has(l.file));

  console.log(`${lines.length} fixed lines, ${characters} characters in total.`);
  console.log(`${lines.length - missing.length} already generated, ${missing.length} to generate.`);
  if (dryRun) {
    const groups = new Map<string, number>();
    lines.forEach((l) => groups.set(l.group, (groups.get(l.group) ?? 0) + 1));
    console.log('By group:', Object.fromEntries([...groups].sort()));
    console.log('Dry run: nothing was generated and nothing was spent.');
    return;
  }

  const clips: Record<string, string> = {};
  planned.forEach((l) => {
    clips[voiceKey(l.text)] = l.file;
  });

  let made = 0;
  let failed = 0;
  for (const line of missing.slice(0, Number.isFinite(limit) ? limit : missing.length)) {
    try {
      const audio = await speakOne(line.text, apiKey, voiceId, modelId);
      await writeFile(path.join(OUT_DIR, line.file), audio);
      made += 1;
      console.log(`  [${made}/${missing.length}] ${line.group}: ${line.text.slice(0, 60)}`);
    } catch (e) {
      failed += 1;
      console.error(`  failed: ${(e as Error).message}`);
      // a line that could not be generated must not be promised by the manifest
      delete clips[voiceKey(line.text)];
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }

  // a line that was neither generated now nor already on disk is dropped, so the manifest only ever
  // promises clips that really exist; the app speaks the rest with the browser's voice
  const onDisk = new Set((await readdir(OUT_DIR).catch(() => [] as string[])).filter((f) => f.endsWith('.mp3')));
  for (const [key, file] of Object.entries(clips)) if (!onDisk.has(file)) delete clips[key];

  const previous = JSON.parse(await readFile(MANIFEST, 'utf8').catch(() => '{}')) as Partial<VoiceManifest>;
  const manifest: VoiceManifest = {
    voiceId,
    generatedAt: new Date().toISOString(),
    // the clips exist, so the server has keys: a line that was not pre-generated may now ask /api/voice for one
    dynamic: true,
    clips: { ...(previous.voiceId === voiceId ? previous.clips : {}), ...clips },
  };
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`\nDone: ${made} generated, ${failed} failed, ${Object.keys(manifest.clips).length} clips in the manifest.`);
  console.log(`Files: ${path.relative(process.cwd(), OUT_DIR)}`);
  if (failed) process.exitCode = 1;
}

void main();
