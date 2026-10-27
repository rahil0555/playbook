import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './helpers';

// One teacher voice for every activity (browser Web Speech API only). Headless Chromium has no voices, so a fake synthesizer is installed.

interface FakeVoice {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
}
const DEVICE: FakeVoice[] = [
  { name: 'Zoe', lang: 'en-US', voiceURI: 'zoe', localService: true },
  { name: 'Remote Rita', lang: 'en_US', voiceURI: 'rita', localService: false },
  { name: 'Daisy', lang: 'en-GB', voiceURI: 'daisy', localService: true },
  { name: 'Español', lang: 'es-ES', voiceURI: 'es', localService: true },
  { name: 'Mandarin', lang: 'zh-CN', voiceURI: 'zh', localService: true },
];

async function installSynth(page: Page, voices: FakeVoice[], opts: { late?: boolean } = {}) {
  await page.addInitScript(
    ({ voices, late }) => {
      const spoken: { text: string; voice: string | null; rate: number; pitch: number }[] = [];
      (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
      let list = late ? [] : voices;
      const handlers: (() => void)[] = [];
      class U {
        text: string;
        lang = '';
        rate = 1;
        pitch = 1;
        voice: { name: string } | null = null;
        onstart?: () => void;
        onend?: () => void;
        constructor(t: string) {
          this.text = t;
        }
      }
      (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = U;
      const synth = {
        cancel() {},
        getVoices: () => list,
        addEventListener: (_t: string, fn: () => void) => handlers.push(fn),
        speak(u: U) {
          spoken.push({ text: u.text, voice: u.voice?.name ?? null, rate: u.rate, pitch: u.pitch });
          setTimeout(() => (u.onstart?.(), setTimeout(() => u.onend?.(), 10)), 5);
        },
      };
      Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
      (window as unknown as { __voicesArrive: () => void }).__voicesArrive = () => {
        list = voices;
        handlers.forEach((h) => h());
      };
    },
    { voices, late: !!opts.late },
  );
}
const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: { text: string; voice: string | null; rate: number; pitch: number }[] }).__spoken);
const savedVoice = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('edurance.playlab.settings.v1') ?? '{}').voice ?? null);

async function openSettings(page: Page, hash = 'home') {
  await page.goto(`/#/${hash}`);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
}

const TEACHER = 'Zoe'; // the device's first American on-device voice: the same choice every time (see voiceCatalog)

test.describe('one teacher voice everywhere', () => {
  test('Settings has no voice choice: no selector, no preview, no Use this voice', async ({ page }) => {
    await installSynth(page, DEVICE);
    await openSettings(page);
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog.getByRole('combobox')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: /Preview voice|Use this voice/ })).toHaveCount(0);
    await expect(dialog.getByRole('switch', { name: 'Sound' })).toBeVisible();
  });

  test('every line, on every screen, uses the same voice at the slower teaching rate', async ({ page }) => {
    await installSynth(page, DEVICE);
    // each screen is opened on its own: a reload starts a fresh record of what was said
    await page.goto('/#/alphabet');
    await page.getByRole('button', { name: /^Letter A,/ }).click();
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
    const alphabet = await spoken(page);
    await page.goto('/#/word-builder');
    await page.getByRole('button', { name: 'Hear the clue' }).first().click();
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
    const magic = await spoken(page);
    for (const lines of [alphabet, magic]) {
      expect(new Set(lines.map((l) => l.voice))).toEqual(new Set([TEACHER]));
      expect(new Set(lines.map((l) => l.rate))).toEqual(new Set([0.85]));
    }
  });

  test('a voice saved by an older version is ignored, and the teacher voice is still used', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: true, level: 'adventurer', voice: 'daisy' })));
    await installSynth(page, DEVICE);
    await page.goto('/#/alphabet');
    await page.getByRole('button', { name: /^Letter B,/ }).click();
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
    expect(new Set((await spoken(page)).map((l) => l.voice))).toEqual(new Set([TEACHER]));
    expect(await savedVoice(page)).toBe('daisy');
  });

  test('voices that arrive late do not change the teacher voice', async ({ page }) => {
    await installSynth(page, DEVICE, { late: true });
    await page.goto('/#/alphabet');
    await page.getByRole('button', { name: /^Letter C,/ }).click();
    await page.evaluate(() => (window as unknown as { __voicesArrive: () => void }).__voicesArrive());
    await page.getByRole('button', { name: /^Letter D,/ }).click();
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(1);
    expect(new Set((await spoken(page)).map((l) => l.voice))).toEqual(new Set([TEACHER]));
  });

  test('a device with no English voice: the activities still work and nothing is thrown', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await installSynth(page, [{ name: 'Mandarin', lang: 'zh-CN', voiceURI: 'zh', localService: true }]);
    await page.goto('/#/alphabet');
    await page.getByRole('button', { name: /^Letter E,/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Letter Playground' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Settings with the sound switch has no WCAG 2.1 A/AA violations', async ({ page }) => {
    await installSynth(page, DEVICE);
    await openSettings(page);
    const results = await new AxeBuilder({ page }).include('[role="dialog"][aria-label="Settings"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
  });
});
