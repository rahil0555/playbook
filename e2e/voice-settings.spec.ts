import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './helpers';

// Voice selector (browser Web Speech API only). Headless Chromium has no voices, so a fake synthesizer is installed.

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
const select = (page: Page) => page.getByRole('combobox', { name: 'Voice' });

test.describe('voice selector', () => {
  test('lists Automatic plus English voices only, with accents and online voices labelled', async ({ page }) => {
    await installSynth(page, DEVICE);
    await openSettings(page);
    const options = await select(page).locator('option').allTextContents();
    expect(options).toEqual(['Automatic (best American English)', 'Zoe (American English)', 'Remote Rita (American English, online)', 'Daisy (British English)']);
  });

  test('Preview plays the sample in the highlighted voice and does not save it', async ({ page }) => {
    await installSynth(page, DEVICE);
    await openSettings(page);
    await select(page).selectOption('daisy');
    await page.getByRole('button', { name: 'Preview voice' }).click();
    await expect.poll(async () => (await spoken(page)).at(-1)?.voice).toBe('Daisy');
    expect((await spoken(page)).at(-1)?.text).toMatch(/Let.s learn our letters together/);
    expect(await savedVoice(page)).toBeNull();
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(select(page)).toHaveValue(''); // still Automatic after a refresh
  });

  test('Use this voice saves it; it is used across the app and survives a refresh', async ({ page }) => {
    await installSynth(page, DEVICE);
    await openSettings(page, 'alphabet');
    await select(page).selectOption('daisy');
    await page.getByRole('button', { name: 'Use this voice' }).click();
    await expect(page.getByText('Saved: Daisy.')).toBeVisible();
    expect(await savedVoice(page)).toBe('daisy');
    await page.keyboard.press('Escape');
    await page.locator('[data-letter="b"]').click();
    await expect.poll(async () => (await spoken(page)).at(-1)?.voice).toBe('Daisy');

    await page.reload(); // persists
    await page.locator('[data-letter="c"]').click();
    await expect.poll(async () => (await spoken(page)).at(-1)?.voice).toBe('Daisy');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(select(page)).toHaveValue('daisy');
  });

  test('Classic Word Builder and Magic Letters both speak with the chosen voice', async ({ page }) => {
    await installSynth(page, DEVICE);
    await page.addInitScript(() => localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: true, level: 'adventurer', voice: 'rita' })));
    await page.goto('/#/word-builder');
    await page.getByRole('button', { name: 'Hear the clue' }).click();
    await expect.poll(async () => (await spoken(page)).at(-1)?.voice).toBe('Remote Rita');
    await page.getByRole('tab', { name: 'Magic Letters' }).click();
    await page.getByRole('button', { name: 'Hear the clue' }).click();
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(1);
    expect((await spoken(page)).at(-1)?.voice).toBe('Remote Rita');
  });

  test('a saved voice that this device does not have falls back to automatic without any error', async ({ page }) => {
    await installSynth(page, DEVICE);
    await page.addInitScript(() => localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: true, level: 'adventurer', voice: 'voice-from-another-phone' })));
    await page.goto('/#/alphabet');
    await page.locator('[data-letter="a"]').click();
    await expect.poll(async () => (await spoken(page)).at(-1)?.voice).toBe('Zoe'); // best local American voice
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(select(page)).toHaveValue('');
  });

  test('speech style: conservative defaults, and isolated sounds are spoken slower', async ({ page }) => {
    await installSynth(page, DEVICE);
    await page.goto('/#/phonics');
    await page.getByRole('button', { name: 'Say the name' }).click();
    await expect.poll(async () => (await spoken(page)).length).toBe(1);
    expect(await spoken(page)).toMatchObject([{ rate: 0.9, pitch: 1.05 }]);
    await page.getByRole('button', { name: 'Play the sound' }).click();
    await expect.poll(async () => (await spoken(page)).length).toBe(2);
    expect((await spoken(page))[1]).toMatchObject({ text: 'aah', rate: 0.8, pitch: 1.05 });
  });

  test('with Sound off, Preview explains instead of speaking, and nothing is spoken', async ({ page }) => {
    await installSynth(page, DEVICE);
    await openSettings(page);
    await page.getByRole('switch', { name: 'Sound' }).click();
    await page.getByRole('button', { name: 'Preview voice' }).click();
    await expect(page.getByText(/Sound is off/).first()).toBeVisible();
    expect(await spoken(page)).toEqual([]);
  });

  test('voices that load late (voiceschanged) appear in the selector', async ({ page }) => {
    await installSynth(page, DEVICE, { late: true });
    await openSettings(page);
    await expect(page.getByTestId('voice-unavailable')).toBeVisible();
    await page.evaluate(() => (window as unknown as { __voicesArrive: () => void }).__voicesArrive());
    await expect(select(page)).toBeVisible();
    await expect(select(page).locator('option')).toHaveCount(4);
  });
});

test.describe('devices without ideal voices', () => {
  test('no American voice: other English voices listed with a clear note', async ({ page }) => {
    await installSynth(page, [DEVICE[2]!, DEVICE[3]!]);
    await openSettings(page);
    expect(await select(page).locator('option').allTextContents()).toEqual(['Automatic (best American English)', 'Daisy (British English)']);
    await expect(page.getByText(/No American English voice was found/)).toBeVisible();
  });

  test('no English voice: no selector, a plain message, and the app still works', async ({ page }) => {
    await installSynth(page, [DEVICE[3]!, DEVICE[4]!]);
    await openSettings(page);
    await expect(select(page)).toHaveCount(0);
    await expect(page.getByTestId('voice-unavailable')).toContainText('No English voice was found');
    await page.getByRole('radio', { name: /Explorer/ }).click();
  });

  test('no speech synthesis at all: Settings explains, activities still work', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }));
    await openSettings(page, 'alphabet');
    await expect(page.getByTestId('voice-unavailable')).toContainText('cannot speak out loud');
    await page.keyboard.press('Escape');
    await page.locator('[data-letter="a"]').click();
    await expect(page.locator('[data-letter="a"]')).toHaveAttribute('aria-pressed', 'true');
  });
});

test('accessibility: Settings with the voice selector has no WCAG 2.1 A/AA violations, and works by keyboard', async ({ page }) => {
  await installSynth(page, DEVICE);
  await openSettings(page);
  await page.waitForTimeout(300);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
  await select(page).focus();
  await page.keyboard.press('ArrowDown');
  await page.getByRole('button', { name: 'Preview voice' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await spoken(page)).length).toBe(1);
});
