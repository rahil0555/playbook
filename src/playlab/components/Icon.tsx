import type { SVGProps } from 'react';

export type IconName =
  | 'home' | 'star' | 'speaker' | 'speaker-off' | 'replay' | 'check' | 'arrow-right' | 'arrow-left'
  | 'settings' | 'refresh' | 'bulb' | 'close' | 'undo' | 'exit' | 'trophy' | 'sparkle' | 'play';

const PATHS: Record<IconName, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5',
  star: 'm12 3.5 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8Z',
  speaker: 'M4 9.5v5h3.5L12 18.5v-13L7.5 9.5ZM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11',
  'speaker-off': 'M4 9.5v5h3.5L12 18.5v-13L7.5 9.5ZM16 9.5l5 5M21 9.5l-5 5',
  replay: 'M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 4.5v4h4',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 12l1.8 1-1.6 2.8-2-.4a7 7 0 0 1-1.6 1l-.6 2h-3.2l-.6-2a7 7 0 0 1-1.6-1l-2 .4L4.2 13 6 12a7 7 0 0 1 0-2L4.2 9l1.6-2.8 2 .4a7 7 0 0 1 1.6-1l.6-2h3.2l.6 2a7 7 0 0 1 1.6 1l2-.4L20 9l-1.8 1a7 7 0 0 1 0 2Z',
  refresh: 'M19.5 12a7.5 7.5 0 1 1-2.4-5.5M19.5 4.5v4h-4',
  bulb: 'M9 18h6M10 21h4M12 3.5a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-.6c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.5Z',
  close: 'm6 6 12 12M18 6 6 18',
  undo: 'M9 7 4.5 11.5 9 16M5 11.5h9a5 5 0 0 1 0 10h-3',
  exit: 'M14 4.5h5.5v15H14M10 8l-4 4 4 4M6 12h10',
  trophy: 'M8 4.5h8v5a4 4 0 0 1-8 0ZM8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13.5v3.5M8.5 20h7M10 17h4',
  sparkle: 'M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.5l-1.6-5.3L5 10.6 10.4 9ZM18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z',
  play: 'M8 5.5v13l11-6.5Z',
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  filled?: boolean;
}

/** Decorative by default (aria-hidden); always paired with a text label or aria-label on the parent control. */
export function Icon({ name, size = 24, filled = false, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
