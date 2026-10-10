import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayLab } from '../app/PlayLab';
import { createMemoryAdapter } from '../services/progressService';
import type { PlayLabProps } from '../types/api';
import type { ProgressAdapter } from '../types/learning';

/** Render PlayLab with an in-memory progress adapter so tests are isolated from localStorage. */
export function renderPlayLab(props: PlayLabProps = {}) {
  const adapter: ProgressAdapter = props.progressAdapter ?? createMemoryAdapter();
  const user = userEvent.setup();
  const utils = render(<PlayLab {...props} progressAdapter={adapter} />);
  return { user, adapter, ...utils };
}
