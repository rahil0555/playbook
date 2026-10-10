/**
 * PlayLab wordmark. The mark is a stand-in drawn for this standalone build;
 * swap in the official Edurance logo asset when integrating (see docs).
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="19" fill="#16a286" />
      <path d="M22 16h22a3 3 0 0 1 0 6H28v7h13a3 3 0 0 1 0 6H28v7h16a3 3 0 0 1 0 6H22a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3Z" fill="#fff" />
      <path d="M50 8l1.8 4.2L56 14l-4.2 1.8L50 20l-1.8-4.2L44 14l4.2-1.8Z" fill="#f5b82e" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-display leading-none ${compact ? 'hidden min-[420px]:block' : ''}`}>
        <span className="block text-[1.15rem] font-bold text-ink">Edurance</span>
        <span className="block text-[0.95rem] font-semibold text-brand-700">PlayLab</span>
      </span>
    </span>
  );
}
