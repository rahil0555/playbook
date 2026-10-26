import graduationCap from '../assets/edurance-graduation-cap.png';

/**
 * The Edurance graduation-cap logo, from the supplied artwork. It is fitted inside a square of `size` without stretching or
 * cropping. The wordmark beside it names the product, so the image is decorative.
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  return <img src={graduationCap} width={size} height={size} alt="" className="object-contain" />;
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
