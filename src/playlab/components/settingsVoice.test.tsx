import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { audioLog, fakeDevice, resetFakeDevice, voiceLog } from '../test/fakeAudio';
import { renderPlayLab } from '../test/utils';
import { PREVIEW_TEXT } from './SettingsPanel';

const VOICES = [
  { name: 'Zoe', lang: 'en-US', voiceURI: 'zoe', localService: true },
  { name: 'Remote Rita', lang: 'en_US', voiceURI: 'rita', localService: false },
  { name: 'Daisy', lang: 'en-GB', voiceURI: 'daisy', localService: true },
  { name: 'Español', lang: 'es-ES', voiceURI: 'es', localService: true },
];
afterEach(resetFakeDevice);

async function openSettings(props: Parameters<typeof renderPlayLab>[0] = {}) {
  const r = renderPlayLab(props);
  await r.user.click(await screen.findByRole('button', { name: 'Settings' }));
  await screen.findByRole('dialog', { name: 'Settings' });
  return r;
}
const select = () => screen.getByRole('combobox', { name: 'Voice' }) as HTMLSelectElement;
const previewBtn = () => screen.getByRole('button', { name: 'Preview voice' });
const useBtn = () => screen.getByRole('button', { name: 'Use this voice' });
const saved = () => JSON.parse(window.localStorage.getItem('edurance.playlab.settings.v1') ?? '{}');

describe('Settings: voice selector', () => {
  it('lists Automatic plus English voices only, with accents and online voices labelled', async () => {
    fakeDevice.voices = VOICES;
    await openSettings();
    const options = within(select()).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Automatic (best American English)', 'Zoe (American English)', 'Remote Rita (American English, online)', 'Daisy (British English)']);
    expect(options.join()).not.toMatch(/Español/);
  });

  it('Preview plays the sample in the highlighted voice and does NOT save it', async () => {
    fakeDevice.voices = VOICES;
    const { user } = await openSettings();
    await user.selectOptions(select(), 'daisy');
    await user.click(previewBtn());
    expect(audioLog.at(-1)).toMatchObject({ text: PREVIEW_TEXT, voice: 'daisy', lang: 'en-US' });
    expect(voiceLog.filter((v) => v === 'daisy')).toHaveLength(0); // never sent to setVoice
    expect(saved().voice ?? null).toBeNull();
    expect(useBtn()).toBeEnabled(); // there is something to save
  });

  it('Use this voice saves it (and only then); the button is disabled when nothing changed', async () => {
    fakeDevice.voices = VOICES;
    const { user } = await openSettings();
    expect(useBtn()).toBeDisabled();
    await user.selectOptions(select(), 'zoe');
    expect(saved().voice ?? null).toBeNull(); // choosing alone saves nothing
    await user.click(useBtn());
    expect(saved().voice).toBe('zoe');
    expect(voiceLog.at(-1)).toBe('zoe');
    expect(screen.getByText('Saved: Zoe.')).toBeInTheDocument();
    expect(useBtn()).toBeDisabled();
  });

  it('can go back to Automatic', async () => {
    fakeDevice.voices = VOICES;
    window.localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: true, level: 'adventurer', voice: 'daisy' }));
    const { user } = await openSettings();
    expect(select().value).toBe('daisy'); // the saved voice is preselected
    await user.selectOptions(select(), '');
    await user.click(useBtn());
    expect(saved().voice).toBeNull();
    expect(voiceLog.at(-1)).toBeNull();
  });

  it('a saved voice that no longer exists shows as Automatic (no error)', async () => {
    fakeDevice.voices = VOICES;
    window.localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: true, level: 'adventurer', voice: 'gone-from-this-device' }));
    await openSettings();
    expect(select().value).toBe('');
  });

  it('applies the saved voice when PlayLab starts', async () => {
    fakeDevice.voices = VOICES;
    window.localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: true, level: 'adventurer', voice: 'rita' }));
    renderPlayLab();
    await screen.findByRole('heading', { level: 1, name: /Hello/ });
    expect(voiceLog).toContain('rita');
  });

  it('with sound off, Preview explains instead of playing', async () => {
    fakeDevice.voices = VOICES;
    const { user } = await openSettings();
    await user.click(screen.getByRole('switch', { name: 'Sound' }));
    await user.click(previewBtn());
    expect(await screen.findByText(/Sound is off/)).toBeInTheDocument();
  });

  it('keeps the sound switch and level picker working', async () => {
    fakeDevice.voices = VOICES;
    const { user } = await openSettings();
    await user.click(screen.getByRole('radio', { name: /Starter/ }));
    expect(screen.getByRole('radio', { name: /Starter/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'true');
  });

  it('hides the level picker for a host-locked level but still shows the voice section', async () => {
    fakeDevice.voices = VOICES;
    await openSettings({ level: 'starter' });
    expect(screen.queryByRole('radio', { name: /Starter/ })).toBeNull();
    expect(select()).toBeInTheDocument();
  });
});

describe('Settings: devices without ideal voices', () => {
  it('no American English voice: lists the others and explains the closest English voice is used', async () => {
    fakeDevice.voices = [VOICES[2]!, VOICES[3]!];
    await openSettings();
    expect(within(select()).getAllByRole('option').map((o) => o.textContent)).toEqual(['Automatic (best American English)', 'Daisy (British English)']);
    expect(screen.getByText(/No American English voice was found/)).toBeInTheDocument();
  });

  it('no English voice at all: no selector, a plain explanation, and the rest of Settings still works', async () => {
    fakeDevice.voices = [VOICES[3]!];
    const { user } = await openSettings();
    expect(screen.queryByRole('combobox', { name: 'Voice' })).toBeNull();
    expect(screen.getByTestId('voice-unavailable')).toHaveTextContent(/No English voice was found/);
    await user.click(screen.getByRole('radio', { name: /Explorer/ }));
  });

  it('browser without speech: says so kindly', async () => {
    fakeDevice.speechSupported = false;
    await openSettings();
    expect(screen.getByTestId('voice-unavailable')).toHaveTextContent(/cannot speak out loud/);
  });
});

describe('Settings: accessibility', () => {
  it('the select has a visible label, buttons have names, and results are announced in a status region', async () => {
    fakeDevice.voices = VOICES;
    const { user } = await openSettings();
    expect(select()).toHaveAccessibleName('Voice');
    await user.selectOptions(select(), 'zoe');
    await user.click(useBtn());
    expect(within(screen.getByTestId('voice-section')).getByRole('status')).toHaveTextContent('Saved: Zoe.');
  });
});
