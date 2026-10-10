// Offline tests for the audition generator. No network, no real key: uses a local mock server.
// Run: node --test scripts/voice/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PHRASES, DEFAULT_VOICES, estimate, redact, instructionsFor, run, PERSONA } from './audition.mjs';

const quiet = () => undefined;

function mock(handler) {
  return new Promise((resolve) => {
    const seen = [];
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        seen.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(body || '{}') });
        handler(req, res, seen);
      });
    }).listen(0, () => resolve({ server, seen, url: `http://127.0.0.1:${server.address().port}/v1` }));
  });
}

test('audition set: about 10 phrases covering names, isolated sounds, a word and praise', () => {
  assert.equal(PHRASES.length, 10);
  const groups = new Set(PHRASES.map((p) => p.group));
  for (const g of ['name', 'sound', 'word', 'praise']) assert.ok(groups.has(g), g);
  assert.equal(new Set(PHRASES.map((p) => p.id)).size, PHRASES.length);
});

test('sound phrases carry the "isolated sound, not the letter name" rule; every phrase carries the persona', () => {
  for (const p of PHRASES) assert.ok(instructionsFor(p).startsWith(PERSONA));
  for (const p of PHRASES.filter((x) => x.group === 'sound')) assert.match(instructionsFor(p), /Do NOT say the name of the letter/);
});

test('cost estimate is small and bounded for the default set', () => {
  const e = estimate(PHRASES, DEFAULT_VOICES);
  assert.equal(e.requests, 30);
  assert.ok(e.usd < 0.1 && e.usdUpper < 1);
});

test('redact removes anything key-shaped', () => {
  assert.equal(redact('bad key sk-abcDEF123456xyz here'), 'bad key sk-[redacted] here');
  assert.equal(redact('Authorization: Bearer abc.def'), 'Authorization: Bearer [redacted]');
});

test('dry run (default) sends nothing and needs no key', async () => {
  const m = await mock((_, res) => res.end());
  const out = await mkdtemp(join(tmpdir(), 'aud-'));
  const r = await run(['--out', out], { OPENAI_BASE_URL: m.url }, quiet);
  assert.equal(r.dryRun, true);
  assert.equal(m.seen.length, 0);
  assert.deepEqual(await readdir(out), []);
  m.server.close();
});

test('--yes without a key refuses and sends nothing', async () => {
  const m = await mock((_, res) => res.end());
  await assert.rejects(run(['--yes', '--out', await mkdtemp(join(tmpdir(), 'aud-'))], { OPENAI_BASE_URL: m.url }, quiet), /OPENAI_API_KEY is not set/);
  assert.equal(m.seen.length, 0);
  m.server.close();
});

test('refuses to exceed --max-requests', async () => {
  await assert.rejects(run(['--yes', '--max-requests', '5'], { OPENAI_API_KEY: 'x' }, quiet), /exceeds --max-requests/);
});

test('--yes with a (fake) key writes mp3s, a listening page and a manifest that never contains the key; reruns skip existing files', async () => {
  const FAKE = 'sk-FAKE-test-key-not-real-123456';
  const m = await mock((_, res) => {
    res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
    res.end(Buffer.from([0xff, 0xfb, 0x90, 0x00]));
  });
  const out = await mkdtemp(join(tmpdir(), 'aud-'));
  const env = { OPENAI_API_KEY: FAKE, OPENAI_BASE_URL: m.url };
  const r = await run(['--yes', '--out', out, '--voices', 'marin,coral', '--only', 'name-a,sound-b'], env, quiet);
  assert.equal(r.made, 4);
  assert.equal(m.seen.length, 4);
  assert.ok(m.seen.every((s) => s.auth === `Bearer ${FAKE}` && s.url === '/v1/audio/speech'));
  assert.equal(m.seen[0].body.model, 'gpt-4o-mini-tts');
  assert.equal(m.seen[0].body.response_format, 'mp3');
  assert.match(m.seen[0].body.instructions, /cartoon teacher/);
  for (const f of ['index.html', 'manifest.json']) assert.ok(!(await readFile(join(out, f), 'utf8')).includes(FAKE), `${f} must not contain the key`);
  const again = await run(['--yes', '--out', out, '--voices', 'marin,coral', '--only', 'name-a,sound-b'], env, quiet);
  assert.equal(again.made, 0);
  assert.equal(again.skipped, 4);
  assert.equal(m.seen.length, 4); // nothing re-sent
  m.server.close();
});

test('an auth failure stops immediately and the key is never printed', async () => {
  const FAKE = 'sk-FAKE-test-key-not-real-123456';
  const m = await mock((_, res) => {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: `Incorrect API key provided: ${FAKE}` } }));
  });
  const lines = [];
  await assert.rejects(run(['--yes', '--out', await mkdtemp(join(tmpdir(), 'aud-'))], { OPENAI_API_KEY: FAKE, OPENAI_BASE_URL: m.url }, (l) => lines.push(l)), /Authentication failed/);
  assert.equal(m.seen.length, 1); // stopped after the first request
  assert.ok(!lines.join('\n').includes(FAKE));
  m.server.close();
});
