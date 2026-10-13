import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

interface ScreenBoundaryProps {
  children: ReactNode;
  /** when this changes (the screen the child moved to) the error is forgotten, so the next screen can open */
  resetKey: string;
  onHome: () => void;
}

interface ScreenBoundaryState {
  failedFor: string | null;
}

/**
 * Keeps a screen that fails to open (its code could not be downloaded, or it threw) from taking the whole app down.
 * The header stays on screen, so the child can always get back to Home. "Try again" reloads the page, which
 * fetches the screen's code again; a lazily loaded screen cannot be re-imported in place.
 */
export class ScreenBoundary extends Component<ScreenBoundaryProps, ScreenBoundaryState> {
  state: ScreenBoundaryState = { failedFor: null };

  static getDerivedStateFromError(): ScreenBoundaryState {
    return { failedFor: 'error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // logged for the developers; the child only sees the kind message below
    console.error('PlayLab screen failed to open', error, info.componentStack);
  }

  componentDidUpdate(prev: ScreenBoundaryProps) {
    if (prev.resetKey !== this.props.resetKey && this.state.failedFor !== null) this.setState({ failedFor: null });
  }

  render() {
    if (this.state.failedFor === null) return this.props.children;
    return (
      <section role="alert" className="pl-paper mx-auto mt-6 flex max-w-xl flex-col items-center gap-4 rounded-[2rem] p-6 text-center">
        <Icon name="sparkle" size={36} className="text-sun-500" />
        <h2 className="font-display text-2xl font-bold text-ink">This screen couldn’t open.</h2>
        <p className="text-lg text-ink-soft">Check the internet connection, then try again. Your progress is saved on this device.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" accent="brand" icon="refresh" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <Button variant="secondary" accent="sun" icon="home" onClick={this.props.onHome}>
            Home
          </Button>
        </div>
      </section>
    );
  }
}
