export type MascotMood = 'happy' | 'cheer' | 'think' | 'oops';

interface MascotProps {
  mood?: MascotMood;
  className?: string;
  /** Gentle idle float. Off by default; use on at most one mascot per screen. */
  float?: boolean;
}

/** "Pip", the PlayLab helper. A small original character drawn in SVG; mood changes arms and mouth only. */
export function Mascot({ mood = 'happy', className = 'h-28 w-28', float = false }: MascotProps) {
  const mouth =
    mood === 'cheer' ? (
      <path d="M43 62q9 13 18 0Z" fill="#12312c" />
    ) : mood === 'oops' ? (
      // a small, kind smile: "that's okay, try again", never a frown
      <path d="M45 64q7 6 14 0" stroke="#12312c" strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : mood === 'think' ? (
      <path d="M46 65h12" stroke="#12312c" strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : (
      <path d="M44 62q8 9 16 0" stroke="#12312c" strokeWidth="3" fill="none" strokeLinecap="round" />
    );
  return (
    <svg viewBox="0 0 104 112" className={`${className} ${float ? 'pl-float' : ''}`} aria-hidden="true" focusable="false">
      <ellipse cx="52" cy="106" rx="26" ry="4" fill="#12312c" opacity=".1" />
      {/* sprout */}
      <path d="M52 18q0-8 4-12" stroke="#0c7260" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M56 8c8-6 16-2 17 5-8 4-15 2-17-5Z" fill="#f5b82e" />
      {/* arms */}
      {mood === 'cheer' ? (
        <>
          <path d="M16 62Q4 48 10 34" stroke="#0f8a72" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M88 62q12-14 6-28" stroke="#0f8a72" strokeWidth="9" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <path d="M16 66Q6 72 8 82" stroke="#0f8a72" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M88 66q10 6 8 16" stroke="#0f8a72" strokeWidth="9" strokeLinecap="round" fill="none" />
        </>
      )}
      {/* body */}
      <path d="M52 18C26 18 14 40 14 64c0 22 16 38 38 38s38-16 38-38c0-24-12-46-38-46Z" fill="#16a286" />
      <path d="M52 18c26 0 38 22 38 46 0 22-16 38-38 38 18-14 20-70 0-84Z" fill="#0f8a72" opacity=".45" />
      <ellipse cx="52" cy="78" rx="22" ry="17" fill="#d4f3ea" />
      {/* the Edurance "E" on the tummy */}
      <path d="M46 71h12M46 71v14M46 78h9M46 85h12" stroke="#0f8a72" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* eyes */}
      <g className={mood === 'happy' || mood === 'think' ? 'pl-blink' : undefined}>
        <circle cx="38" cy="48" r="9" fill="#fff" />
        <circle cx="66" cy="48" r="9" fill="#fff" />
        <circle cx={mood === 'think' ? 41 : 39} cy={mood === 'think' ? 45 : 49} r="4.6" fill="#12312c" />
        <circle cx={mood === 'think' ? 69 : 67} cy={mood === 'think' ? 45 : 49} r="4.6" fill="#12312c" />
        <circle cx="40.6" cy="47" r="1.5" fill="#fff" />
        <circle cx="68.6" cy="47" r="1.5" fill="#fff" />
      </g>
      {mood === 'oops' ? (
        <>
          <path d="M31 39l12-3" stroke="#0c7260" strokeWidth="3" strokeLinecap="round" />
          <path d="M73 39l-12-3" stroke="#0c7260" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : null}
      <circle cx="28" cy="62" r="4.5" fill="#f8a8bb" opacity=".7" />
      <circle cx="76" cy="62" r="4.5" fill="#f8a8bb" opacity=".7" />
      {mouth}
      {/* feet */}
      <ellipse cx="38" cy="102" rx="11" ry="5" fill="#0c7260" />
      <ellipse cx="66" cy="102" rx="11" ry="5" fill="#0c7260" />
    </svg>
  );
}
