import type { ReactNode } from 'react';
import type { IllustrationId } from '../types/learning';

/**
 * Original, locally drawn SVG illustrations (viewBox 0 0 100 100).
 * Flat shapes, no outlines, two-tone shading, no external assets.
 * These are intentionally simple stand-ins: a design team can replace any
 * entry (see docs/INTEGRATION.md -> "Replacing illustrations").
 */
const C = {
  red: '#e8573f', redD: '#c9402b', green: '#3fae5a', greenL: '#5cc474', yellow: '#f5b82e', yellowL: '#fbd06a',
  orange: '#f5883a', orangeD: '#e07622', brown: '#8a5a3b', brownL: '#c88a55', cream: '#fff1d6',
  teal: '#16a286', tealD: '#0c7260', sky: '#5ab4ec', blue: '#2f8fd8', blueD: '#1f6fb2', blueL: '#8cc6f0',
  pink: '#f8a8bb', pinkD: '#e57a95', purple: '#8a5cc7', purpleD: '#6f45ac', ink: '#12312c', white: '#fff',
};

const Eyes = ({ y, gap = 12, r = 3.4 }: { y: number; gap?: number; r?: number }) => (
  <>
    <circle cx={50 - gap} cy={y} r={r} fill={C.ink} />
    <circle cx={50 + gap} cy={y} r={r} fill={C.ink} />
    <circle cx={50 - gap + 1.1} cy={y - 1.2} r={r * 0.32} fill="#fff" />
    <circle cx={50 + gap + 1.1} cy={y - 1.2} r={r * 0.32} fill="#fff" />
  </>
);

type Art = (uid: string) => ReactNode;

export const ART: Record<IllustrationId, Art> = {
  apple: () => (
    <>
      <path d="M50 30C40 22 20 26 20 50c0 20 12 38 30 38s30-18 30-38c0-24-20-28-30-20Z" fill={C.red} />
      <path d="M50 30c10-8 30-4 30 20 0 20-12 38-30 38 12-14 14-40 0-58Z" fill={C.redD} opacity=".35" />
      <path d="M50 32c0-8 2-14 6-19" stroke={C.brown} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M54 24c6-9 17-9 23-4-4 9-15 11-23 4Z" fill={C.green} />
      <ellipse cx="32" cy="48" rx="4" ry="9" fill="#fff" opacity=".4" transform="rotate(15 32 48)" />
    </>
  ),
  ball: () => (
    <>
      <circle cx="50" cy="52" r="36" fill={C.red} />
      <path d="M16 42Q50 26 84 42L86 54Q50 38 14 54Z" fill="#fff" />
      <path d="M17 62Q50 76 83 62Q76 80 50 88Q24 80 17 62Z" fill={C.yellow} />
      <ellipse cx="34" cy="32" rx="8" ry="5" fill="#fff" opacity=".4" transform="rotate(-30 34 32)" />
    </>
  ),
  cat: () => (
    <>
      <path d="M20 42 22 12 46 28Z" fill="#e8812e" />
      <path d="M80 42 78 12 54 28Z" fill="#e8812e" />
      <path d="M26 34 27 21 38 28Z" fill={C.pinkD} />
      <path d="M74 34 73 21 62 28Z" fill={C.pinkD} />
      <ellipse cx="50" cy="56" rx="33" ry="29" fill="#f5993f" />
      <path d="M50 28v9M41 30l2 8M59 30l-2 8" stroke="#d9741c" strokeWidth="3.2" strokeLinecap="round" />
      <ellipse cx="50" cy="66" rx="15" ry="11" fill={C.cream} />
      <Eyes y={54} gap={14} r={4} />
      <path d="M46 62h8l-4 4Z" fill={C.pinkD} />
      <path d="M50 66q-4 6-9 3M50 66q4 6 9 3" stroke={C.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M26 62 12 59M26 67 12 70M74 62l14-3M74 67l14 3" stroke={C.ink} strokeWidth="1.8" opacity=".45" strokeLinecap="round" />
    </>
  ),
  dog: () => (
    <>
      <ellipse cx="22" cy="48" rx="11" ry="23" fill={C.brown} transform="rotate(14 22 48)" />
      <ellipse cx="78" cy="48" rx="11" ry="23" fill={C.brown} transform="rotate(-14 78 48)" />
      <ellipse cx="50" cy="52" rx="29" ry="29" fill={C.brownL} />
      <ellipse cx="62" cy="44" rx="10" ry="9" fill={C.brown} opacity=".45" />
      <ellipse cx="50" cy="65" rx="17" ry="14" fill={C.cream} />
      <Eyes y={45} gap={13} r={3.8} />
      <ellipse cx="50" cy="57" rx="6.5" ry="4.8" fill={C.ink} />
      <path d="M50 61v5M50 66q-6 6-11 1M50 66q6 6 11 1" stroke={C.ink} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M46 70q4 11 8 0Z" fill="#f26d85" />
    </>
  ),
  egg: () => (
    <>
      <ellipse cx="50" cy="88" rx="26" ry="5" fill={C.ink} opacity=".1" />
      <path d="M50 10C32 10 20 40 20 60c0 18 13 28 30 28s30-10 30-28C80 40 68 10 50 10Z" fill="#fbe3bd" />
      <path d="M50 10C68 10 80 40 80 60c0 18-13 28-30 28 14-12 18-50 0-78Z" fill="#e9c58f" opacity=".5" />
      <ellipse cx="36" cy="44" rx="4.5" ry="11" fill="#fff" opacity=".6" transform="rotate(14 36 44)" />
    </>
  ),
  fish: () => (
    <>
      <path d="M70 50 92 30Q86 50 92 70Z" fill={C.red} />
      <ellipse cx="46" cy="50" rx="31" ry="22" fill={C.orange} />
      <ellipse cx="44" cy="60" rx="21" ry="9" fill="#ffc78a" />
      <path d="M44 30Q54 18 66 25 60 32 54 38Z" fill={C.red} />
      <circle cx="30" cy="44" r="5.5" fill="#fff" />
      <circle cx="29" cy="44" r="2.8" fill={C.ink} />
      <path d="M17 54q4 4 8 1" stroke={C.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M52 36q-4 14 0 28M62 38q-3 12 0 24" stroke={C.red} strokeWidth="2.5" fill="none" opacity=".5" strokeLinecap="round" />
      <circle cx="12" cy="30" r="3" fill="none" stroke={C.sky} strokeWidth="2" />
      <circle cx="7" cy="19" r="2" fill="none" stroke={C.sky} strokeWidth="2" />
    </>
  ),
  goat: () => (
    <>
      <path d="M32 32Q20 14 28 6q4 12 14 20Z" fill="#d9c7a0" />
      <path d="M68 32Q80 14 72 6q-4 12-14 20Z" fill="#d9c7a0" />
      <ellipse cx="17" cy="46" rx="13" ry="6" fill="#d3c4ad" transform="rotate(-22 17 46)" />
      <ellipse cx="83" cy="46" rx="13" ry="6" fill="#d3c4ad" transform="rotate(22 83 46)" />
      <ellipse cx="50" cy="50" rx="23" ry="27" fill="#efe7d8" />
      <ellipse cx="50" cy="68" rx="14" ry="11" fill="#d9cdb8" />
      <ellipse cx="44" cy="67" rx="2" ry="3" fill={C.ink} />
      <ellipse cx="56" cy="67" rx="2" ry="3" fill={C.ink} />
      <ellipse cx="39" cy="48" rx="5" ry="4" fill={C.yellow} />
      <ellipse cx="61" cy="48" rx="5" ry="4" fill={C.yellow} />
      <rect x="38" y="45.5" width="2" height="5.5" rx="1" fill={C.ink} />
      <rect x="60" y="45.5" width="2" height="5.5" rx="1" fill={C.ink} />
      <path d="M44 76q6 18 12 0Z" fill="#d3c4ad" />
    </>
  ),
  hat: () => (
    <>
      <ellipse cx="50" cy="66" rx="42" ry="14" fill={C.yellow} />
      <ellipse cx="50" cy="63" rx="42" ry="12" fill={C.yellowL} />
      <path d="M26 62C26 26 38 24 50 24s24 2 24 38Z" fill={C.yellowL} />
      <path d="M26 54Q50 64 74 54L74 62Q50 72 26 62Z" fill={C.red} />
      <path d="M50 24c12 0 24 2 24 38L50 62Z" fill={C.yellow} opacity=".35" />
      <ellipse cx="38" cy="38" rx="3.5" ry="8" fill="#fff" opacity=".45" transform="rotate(14 38 38)" />
    </>
  ),
  igloo: () => (
    <>
      <ellipse cx="50" cy="80" rx="44" ry="7" fill={C.blueL} opacity=".6" />
      <path d="M12 78Q12 24 50 24t38 54Z" fill="#e8f3fb" />
      <path d="M50 24q38 0 38 54H66Q70 40 50 24Z" fill={C.blueL} opacity=".35" />
      <path d="M15 64H85M22 48H78M50 25V48M34 48V64M66 48V64M24 64V78M76 64V78" stroke="#b5d3e8" strokeWidth="2.5" fill="none" />
      <path d="M38 78V68q0-12 12-12t12 12v10Z" fill={C.blueD} />
    </>
  ),
  jar: () => (
    <>
      <rect x="29" y="12" width="42" height="11" rx="4" fill={C.yellow} />
      <rect x="34" y="23" width="32" height="8" fill="#d9ecfb" />
      <path d="M30 30H70Q80 38 80 50V80Q80 90 70 90H30Q20 90 20 80V50Q20 38 30 30Z" fill="#d9ecfb" />
      <path d="M22 48H78V80Q78 88 70 88H30Q22 88 22 80Z" fill={C.purple} />
      <rect x="33" y="56" width="34" height="22" rx="5" fill="#fff" />
      <circle cx="44" cy="67" r="5" fill={C.red} />
      <path d="M44 62q1-4 4-4" stroke={C.green} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M54 64h8M54 70h6" stroke={'#8fa19e'} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="25" y="36" width="4.5" height="40" rx="2.2" fill="#fff" opacity=".55" />
    </>
  ),
  kite: () => (
    <>
      <path d="M50 6 78 40 50 76 22 40Z" fill={C.red} />
      <path d="M50 6 22 40 50 76Z" fill={C.redD} />
      <path d="M50 6V76M22 40H78" stroke="#fff" strokeWidth="2" opacity=".85" />
      <path d="M50 76Q38 86 52 92T50 99" stroke="#43615b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M47 82 40 78l1 8Z" fill={C.yellow} />
      <path d="M53 93l7-3-1 8Z" fill={C.blue} />
    </>
  ),
  lion: () => (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={50 + Math.cos(a) * 33} cy={52 + Math.sin(a) * 33} r="11" fill="#d9822b" />;
      })}
      <circle cx="50" cy="52" r="34" fill="#d9822b" />
      <circle cx="27" cy="31" r="8" fill="#fbc15a" />
      <circle cx="73" cy="31" r="8" fill="#fbc15a" />
      <circle cx="27" cy="31" r="4" fill={C.pinkD} />
      <circle cx="73" cy="31" r="4" fill={C.pinkD} />
      <circle cx="50" cy="54" r="26" fill="#fbc15a" />
      <ellipse cx="50" cy="65" rx="13" ry="10" fill={C.cream} />
      <Eyes y={48} gap={11} r={3.6} />
      <path d="M45 58h10l-5 5Z" fill={C.ink} />
      <path d="M50 63q-5 7-10 2M50 63q5 7 10 2" stroke={C.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  moon: (uid) => (
    <>
      <mask id={`${uid}-m`}>
        <rect width="100" height="100" fill="#fff" />
        <circle cx="66" cy="38" r="28" fill="#000" />
      </mask>
      <circle cx="46" cy="54" r="36" fill={C.yellow} mask={`url(#${uid}-m)`} />
      <path d="M80 68l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill={C.yellow} />
      <path d="M82 20l1.6 4.4 4.4 1.6-4.4 1.6L82 32l-1.6-4.4L76 26l4.4-1.6Z" fill={C.yellowL} />
      <circle cx="74" cy="52" r="2.6" fill={C.yellowL} />
    </>
  ),
  nest: () => (
    <>
      <ellipse cx="36" cy="48" rx="9" ry="11" fill="#cfe8f5" />
      <ellipse cx="52" cy="43" rx="9" ry="11" fill="#e6f3fb" />
      <ellipse cx="67" cy="49" rx="9" ry="11" fill="#cfe8f5" />
      <circle cx="50" cy="40" r="1.4" fill={C.blue} />
      <circle cx="35" cy="44" r="1.4" fill={C.blue} />
      <circle cx="68" cy="46" r="1.4" fill={C.blue} />
      <path d="M8 52Q12 88 50 90T92 52Q50 68 8 52Z" fill="#b07a42" />
      <path d="M14 62Q50 78 86 62M22 72Q50 84 78 72M36 82Q50 88 64 82" stroke="#7a4f28" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M6 56l16 6M94 56 78 62" stroke="#7a4f28" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  orange: () => (
    <>
      <circle cx="50" cy="56" r="35" fill={C.orange} />
      <path d="M50 21a35 35 0 0 1 0 70 28 35 0 0 0 0-70Z" fill={C.orangeD} opacity=".35" />
      {[[34, 50], [58, 44], [46, 68], [66, 66], [30, 70], [52, 54]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill={C.orangeD} />
      ))}
      <path d="M50 22q0-8 4-10" stroke={C.brown} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M52 22c6-10 20-10 26-4-6 10-18 12-26 4Z" fill={C.green} />
      <ellipse cx="32" cy="42" rx="4.5" ry="9" fill="#fff" opacity=".4" transform="rotate(18 32 42)" />
    </>
  ),
  pig: () => (
    <>
      <path d="M22 38 18 12 42 26Z" fill={C.pinkD} />
      <path d="M78 38 82 12 58 26Z" fill={C.pinkD} />
      <circle cx="50" cy="54" r="33" fill={C.pink} />
      <circle cx="26" cy="62" r="6" fill={C.pinkD} opacity=".45" />
      <circle cx="74" cy="62" r="6" fill={C.pinkD} opacity=".45" />
      <ellipse cx="50" cy="62" rx="16" ry="12" fill="#f48aa4" />
      <ellipse cx="44" cy="62" rx="2.8" ry="4.4" fill={C.ink} opacity=".8" />
      <ellipse cx="56" cy="62" rx="2.8" ry="4.4" fill={C.ink} opacity=".8" />
      <Eyes y={44} gap={15} r={3.8} />
    </>
  ),
  quilt: () => (
    <>
      <rect x="10" y="10" width="80" height="80" rx="8" fill="#fff" />
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => {
          const palette = [C.red, C.yellow, C.teal, C.sky, C.pink, C.purple];
          return <rect key={`${r}${c}`} x={15 + c * 25} y={15 + r * 25} width="22" height="22" rx="3" fill={palette[(r * 3 + c * 2) % palette.length]} />;
        }),
      )}
      <path d="M12 12H88V88H12Z" fill="none" stroke={C.ink} strokeOpacity=".25" strokeWidth="1.6" strokeDasharray="4 3" />
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <circle key={`d${r}${c}`} cx={26 + c * 25} cy={26 + r * 25} r="2" fill="#fff" opacity=".8" />))}
    </>
  ),
  rabbit: () => (
    <>
      <ellipse cx="36" cy="26" rx="9" ry="23" fill="#dcd1c4" transform="rotate(-6 36 26)" />
      <ellipse cx="64" cy="26" rx="9" ry="23" fill="#dcd1c4" transform="rotate(6 64 26)" />
      <ellipse cx="36" cy="28" rx="4.2" ry="16" fill={C.pink} transform="rotate(-6 36 28)" />
      <ellipse cx="64" cy="28" rx="4.2" ry="16" fill={C.pink} transform="rotate(6 64 28)" />
      <ellipse cx="50" cy="63" rx="30" ry="25" fill="#e8dfd3" />
      <circle cx="30" cy="68" r="5" fill={C.pink} opacity=".6" />
      <circle cx="70" cy="68" r="5" fill={C.pink} opacity=".6" />
      <Eyes y={58} gap={14} r={3.8} />
      <path d="M46 65h8l-4 4Z" fill={C.pinkD} />
      <path d="M50 69q-4 5-8 2M50 69q4 5 8 2" stroke={C.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="46" y="72" width="3.6" height="6" rx="1.2" fill="#fff" />
      <rect x="50.4" y="72" width="3.6" height="6" rx="1.2" fill="#fff" />
    </>
  ),
  sun: () => (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <path key={i} d={`M${50 + Math.cos(a) * 33} ${50 + Math.sin(a) * 33}L${50 + Math.cos(a) * 44} ${50 + Math.sin(a) * 44}`} stroke={C.yellow} strokeWidth="6.5" strokeLinecap="round" />
        );
      })}
      <circle cx="50" cy="50" r="26" fill={C.yellow} />
      <circle cx="50" cy="50" r="26" fill={C.orange} opacity=".12" />
      <Eyes y={46} gap={9} r={3.2} />
      <circle cx="36" cy="55" r="4" fill={C.orange} opacity=".5" />
      <circle cx="64" cy="55" r="4" fill={C.orange} opacity=".5" />
      <path d="M41 56q9 10 18 0" stroke={C.ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </>
  ),
  tree: () => (
    <>
      <ellipse cx="50" cy="92" rx="26" ry="4" fill={C.ink} opacity=".08" />
      <path d="M43 90 45 54h10l2 36Z" fill={C.brown} />
      <circle cx="30" cy="48" r="19" fill={C.green} />
      <circle cx="70" cy="48" r="19" fill={C.green} />
      <circle cx="50" cy="32" r="24" fill={C.green} />
      <circle cx="50" cy="52" r="18" fill={C.green} />
      <circle cx="42" cy="26" r="9" fill={C.greenL} opacity=".7" />
      <circle cx="36" cy="46" r="3.4" fill={C.red} />
      <circle cx="64" cy="40" r="3.4" fill={C.red} />
      <circle cx="56" cy="56" r="3.4" fill={C.red} />
    </>
  ),
  umbrella: () => (
    <>
      <path d="M50 8v8" stroke="#43615b" strokeWidth="4" strokeLinecap="round" />
      <path d="M8 54Q8 14 50 14t42 40Q82 46 71 54 60 46 50 54 40 46 29 54 18 46 8 54Z" fill={C.red} />
      <path d="M50 14Q34 26 29 54 40 46 50 54Z" fill={C.yellow} />
      <path d="M50 14Q66 26 71 54 60 46 50 54Z" fill={C.yellow} />
      <path d="M50 52V80Q50 92 39 90Q34 89 34 83" stroke="#43615b" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    </>
  ),
  van: () => (
    <>
      <ellipse cx="50" cy="86" rx="42" ry="4" fill={C.ink} opacity=".08" />
      <path d="M8 74V44q0-6 6-6h44l18 16h12q6 0 6 6v14Z" fill={C.teal} />
      <path d="M8 62h84v12H8Z" fill={C.tealD} opacity=".35" />
      <rect x="16" y="45" width="36" height="14" rx="3" fill="#d9ecfb" />
      <path d="M60 45 72 55H60Z" fill="#d9ecfb" />
      <circle cx="90" cy="64" r="3" fill={C.yellow} />
      <circle cx="28" cy="74" r="11" fill={C.ink} />
      <circle cx="28" cy="74" r="4.4" fill="#c9d3d1" />
      <circle cx="72" cy="74" r="11" fill={C.ink} />
      <circle cx="72" cy="74" r="4.4" fill="#c9d3d1" />
    </>
  ),
  whale: () => (
    <>
      <path d="M40 34Q36 20 26 16M40 34Q44 20 54 16" stroke={C.blueL} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M72 62Q84 66 90 50Q96 40 90 30Q82 36 80 46Q76 38 68 36Z" fill={C.blue} />
      <path d="M6 58Q6 32 42 32T80 58Q80 76 52 80Q8 84 6 58Z" fill={C.blue} />
      <path d="M10 66Q40 86 78 64Q66 80 44 82Q20 82 10 66Z" fill={C.blueL} />
      <circle cx="26" cy="54" r="4" fill="#fff" />
      <circle cx="26" cy="54" r="2.2" fill={C.ink} />
      <path d="M12 66q6 4 12 2" stroke={C.ink} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M16 90q8-4 16 0t16 0 16 0" stroke={C.blueL} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  fox: () => (
    <>
      <path d="M14 10 42 32 14 50Z" fill="#e8683a" />
      <path d="M86 10 58 32 86 50Z" fill="#e8683a" />
      <path d="M20 22 33 32 20 42Z" fill={C.ink} opacity=".75" />
      <path d="M80 22 67 32 80 42Z" fill={C.ink} opacity=".75" />
      <path d="M10 46Q50 28 90 46Q82 74 50 90Q18 74 10 46Z" fill="#ee7a3a" />
      <path d="M50 90Q22 74 14 54Q34 64 50 60Q66 64 86 54Q78 74 50 90Z" fill="#fff7ea" />
      <Eyes y={52} gap={16} r={3.8} />
      <circle cx="50" cy="82" r="4.6" fill={C.ink} />
    </>
  ),
  yoyo: () => (
    <>
      <path d="M50 4V34" stroke="#43615b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="64" r="30" fill={C.blue} />
      <circle cx="50" cy="64" r="21" fill={C.blueL} />
      <circle cx="50" cy="64" r="9" fill={C.yellow} />
      <path d="M30 50a26 26 0 0 1 14-10" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".6" />
    </>
  ),
  zebra: () => (
    <>
      <path d="M36 22 26 6 18 28Z" fill="#f4f1ea" />
      <path d="M64 22 74 6 82 28Z" fill="#f4f1ea" />
      <path d="M38 22 28 8 24 24Z" fill={C.ink} />
      <path d="M62 22 72 8 76 24Z" fill={C.ink} />
      <path d="M40 16 44 2 50 14 56 2 60 16Z" fill={C.ink} />
      <ellipse cx="50" cy="48" rx="25" ry="32" fill="#f4f1ea" />
      <path d="M28 34Q33 36 36 31M27 56Q33 58 36 52M30 66Q34 66 37 62M72 34Q67 36 64 31M73 56Q67 58 64 52M70 66Q66 66 63 62M46 24l-2 8M54 24l2 8" stroke={C.ink} strokeWidth="4.6" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="72" rx="17" ry="14" fill="#5d6d6a" />
      <ellipse cx="44" cy="72" rx="2.4" ry="3.4" fill={C.ink} />
      <ellipse cx="56" cy="72" rx="2.4" ry="3.4" fill={C.ink} />
      <Eyes y={46} gap={11} r={3.6} />
    </>
  ),
  bat: () => (
    <>
      <path d="M38 52Q20 26 4 40q8 4 10 14 4-4 10 4 6-4 12 8Z" fill="#7a63a3" />
      <path d="M62 52Q80 26 96 40q-8 4-10 14-4-4-10 4-6-4-12 8Z" fill="#7a63a3" />
      <path d="M38 36 36 20 46 30Z" fill="#5b4a7a" />
      <path d="M62 36 64 20 54 30Z" fill="#5b4a7a" />
      <ellipse cx="50" cy="60" rx="13" ry="18" fill="#5b4a7a" />
      <circle cx="50" cy="42" r="12" fill="#5b4a7a" />
      <circle cx="45" cy="41" r="3.4" fill="#fff" />
      <circle cx="55" cy="41" r="3.4" fill="#fff" />
      <circle cx="45.5" cy="41.5" r="1.6" fill={C.ink} />
      <circle cx="54.5" cy="41.5" r="1.6" fill={C.ink} />
      <path d="M46 49l2 4 2-4M50 49l2 4 2-4" fill="#fff" />
    </>
  ),
  pen: () => (
    <g transform="rotate(-45 50 50)">
      <rect x="40" y="6" width="20" height="62" rx="7" fill={C.blue} />
      <rect x="57" y="12" width="4" height="28" rx="2" fill={C.blueD} />
      <rect x="40" y="52" width="20" height="16" fill={C.blueL} />
      <path d="M40 68h20L50 92Z" fill="#f5d9a8" />
      <path d="M47.5 84h5L50 92Z" fill={C.ink} />
      <rect x="43" y="12" width="3.4" height="30" rx="1.7" fill="#fff" opacity=".4" />
    </g>
  ),
  cup: () => (
    <>
      <path d="M70 38Q94 36 90 56 86 72 68 68" stroke={C.sky} strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M20 28H72V62Q72 86 46 86T20 62Z" fill={C.sky} />
      <path d="M72 28V62Q72 86 46 86 60 80 62 62V28Z" fill={C.blue} opacity=".35" />
      <ellipse cx="46" cy="28" rx="26" ry="7" fill="#fff" />
      <ellipse cx="46" cy="29" rx="21" ry="4.6" fill="#f3f7fa" />
      <rect x="27" y="40" width="5" height="26" rx="2.5" fill="#fff" opacity=".5" />
    </>
  ),
  book: () => (
    <>
      <rect x="20" y="12" width="60" height="76" rx="7" fill={C.red} />
      <rect x="20" y="12" width="12" height="76" rx="5" fill={C.redD} />
      <path d="M80 18h6v64h-6Z" fill={C.cream} />
      <path d="M82 24v52" stroke="#e5cfa8" strokeWidth="1.6" />
      <circle cx="56" cy="38" r="9" fill={C.yellow} />
      <rect x="42" y="56" width="28" height="5" rx="2.5" fill="#fff" opacity=".9" />
      <rect x="46" y="66" width="20" height="5" rx="2.5" fill="#fff" opacity=".6" />
    </>
  ),
  mango: () => (
    <>
      <path d="M30 24Q60 8 78 36Q94 62 66 84Q36 98 22 66Q14 42 30 24Z" fill={C.yellow} />
      <path d="M30 24Q48 14 62 22Q44 40 40 70Q26 52 30 24Z" fill="#f0763a" opacity=".85" />
      <path d="M66 84Q94 62 78 36 82 60 56 76Z" fill={C.orange} opacity=".5" />
      <path d="M30 24Q26 8 44 8Q46 22 30 24Z" fill={C.green} />
      <ellipse cx="56" cy="40" rx="4" ry="9" fill="#fff" opacity=".4" transform="rotate(30 56 40)" />
    </>
  ),
  bird: () => (
    <>
      <path d="M26 60 4 48 8 66Z" fill={C.blueD} />
      <ellipse cx="46" cy="58" rx="30" ry="22" fill={C.blue} />
      <circle cx="68" cy="40" r="17" fill={C.blue} />
      <ellipse cx="46" cy="68" rx="20" ry="10" fill={C.blueL} />
      <path d="M82 36 97 42 82 48Z" fill={C.yellow} />
      <circle cx="70" cy="36" r="4.4" fill="#fff" />
      <circle cx="71" cy="36" r="2.2" fill={C.ink} />
      <path d="M26 56Q44 30 64 58Q46 68 26 56Z" fill={C.blueD} />
      <path d="M44 80v8M54 80v8M40 88h8M50 88h8" stroke={C.orange} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
};
