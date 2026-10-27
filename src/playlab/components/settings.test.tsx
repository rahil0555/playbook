import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderPlayLab } from '../test/utils';

async function openSettings() {
  const r = renderPlayLab();
  await r.user.click(await screen.findByRole('button', { name: 'Settings' }));
  await screen.findByRole('dialog', { name: 'Settings' });
  return r;
}

const saved = () => JSON.parse(window.localStorage.getItem('edurance.playlab.settings.v1') ?? '{}');

describe('Settings for a child', () => {
  it('offers only the sound switch: no voice choice and no level choice', async () => {
    await openSettings();
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(screen.getByRole('switch', { name: 'Sound' })).toBeInTheDocument();
    expect(dialog.querySelector('select')).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Voice' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Preview voice|Use this voice/ })).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByText(/Starter|Explorer|Adventurer/)).toBeNull();
  });

  it('the sound switch turns sound off and back on, and is remembered', async () => {
    const { user } = await openSettings();
    const sound = screen.getByRole('switch', { name: 'Sound' });
    expect(sound).toHaveAttribute('aria-checked', 'true');
    await user.click(sound);
    expect(screen.getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'false');
    expect(saved().sound).toBe(false);
    await user.click(screen.getByRole('switch', { name: 'Sound' }));
    expect(saved().sound).toBe(true);
  });

  it('a voice or level saved by an older version is kept in storage but changes nothing', async () => {
    window.localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: true, level: 'starter', voice: 'some-old-voice' }));
    renderPlayLab({ initialActivity: 'word-builder' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Magic Letters' })).toBeInTheDocument();
    // the full level is used: Adventurer has two decoy letters, Starter would have none
    expect(document.querySelectorAll('[data-magic-slot]').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[data-magic-tile][data-decoy="true"]').length).toBeGreaterThan(0);
    expect(saved().voice).toBe('some-old-voice');
  });
});
