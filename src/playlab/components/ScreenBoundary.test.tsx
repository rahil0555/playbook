import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ScreenBoundary } from './ScreenBoundary';

function Broken(): never {
  throw new Error('screen code failed');
}

describe('ScreenBoundary', () => {
  it('shows a kind message and a Home button instead of a blank page when a screen throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onHome = vi.fn();
    render(
      <ScreenBoundary resetKey="sentences" onHome={onHome}>
        <Broken />
      </ScreenBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn’t open/);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('Home is passed through to the host', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onHome = vi.fn();
    const user = userEvent.setup();
    render(
      <ScreenBoundary resetKey="sentences" onHome={onHome}>
        <Broken />
      </ScreenBoundary>,
    );
    await user.click(screen.getByRole('button', { name: 'Home' }));
    expect(onHome).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('moving to another screen forgets the failure, so that screen can open', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let go: (k: string) => void = () => undefined;
    function App() {
      const [screen2, setScreen] = useState('broken');
      go = setScreen;
      return (
        <ScreenBoundary resetKey={screen2} onHome={() => undefined}>
          {screen2 === 'broken' ? <Broken /> : <p>Sentence Fun is open</p>}
        </ScreenBoundary>
      );
    }
    render(<App />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    act(() => go('sentences'));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Sentence Fun is open')).toBeInTheDocument();
    spy.mockRestore();
  });
});

