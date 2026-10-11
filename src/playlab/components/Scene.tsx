import type { CSSProperties } from 'react';

/**
 * Illustrated backdrops for the PlayLab screens: a painted sky, drifting clouds, layered hills, trees and flowers.
 * Pure SVG + CSS (no image files, no network). The only motion is slow transform/opacity loops (clouds drift,
 * trees sway, sparkles twinkle); the reduced-motion rules in playlab.css freeze all of them.
 */
export type SceneName = 'meadow' | 'storybook' | 'forest' | 'garden' | 'dusk';

interface Palette {
  sky: [string, string, string];
  glow: string;
  hills: [string, string, string];
  foliage: [string, string, string];
  trunk: string;
  flowers: string[];
  cloud: string;
  /** extra decoration */
  extra?: 'rainbow' | 'fireflies' | 'mushrooms';
}

const PALETTES: Record<SceneName, Palette> = {
  meadow: {
    sky: ['#6cc4ff', '#a9e0ff', '#e6f7ff'],
    glow: 'rgba(255,244,190,0.9)',
    hills: ['#9fe08a', '#63c86a', '#36a95b'],
    foliage: ['#2f9e57', '#47bb68', '#7dd56f'],
    trunk: '#9a5d34',
    flowers: ['#ff7aa8', '#ffd23f', '#ffffff', '#b58cff'],
    cloud: '#ffffff',
  },
  storybook: {
    sky: ['#8fd3ff', '#cfe9ff', '#fff0cf'],
    glow: 'rgba(255,225,150,0.95)',
    hills: ['#c6e57a', '#93cc5f', '#5fb057'],
    foliage: ['#3fa65a', '#62c06a', '#a4dc6e'],
    trunk: '#8a5530',
    flowers: ['#ff9bb8', '#ffe066', '#ffffff', '#ffb36b'],
    cloud: '#fffaf0',
    extra: 'fireflies',
  },
  forest: {
    sky: ['#79d6c8', '#b7ecd8', '#eefbe7'],
    glow: 'rgba(255,255,210,0.8)',
    hills: ['#6cc77d', '#3fae6a', '#23895a'],
    foliage: ['#1f8a57', '#33a869', '#62c97d'],
    trunk: '#7d4a2b',
    flowers: ['#ff8a5c', '#ffd23f', '#ffffff', '#ff7aa8'],
    cloud: '#f4fff9',
    extra: 'mushrooms',
  },
  garden: {
    sky: ['#7fd0ff', '#bfe8ff', '#fff5d9'],
    glow: 'rgba(255,240,170,0.9)',
    hills: ['#a5e37f', '#6fcb67', '#3fae5a'],
    foliage: ['#35a559', '#55c070', '#8fd878'],
    trunk: '#9a5d34',
    flowers: ['#ff6f9f', '#ffd23f', '#ffffff', '#a98bff', '#ff9a4d'],
    cloud: '#ffffff',
    extra: 'rainbow',
  },
  dusk: {
    sky: ['#7aa2ff', '#b9b3ff', '#ffe0cc'],
    glow: 'rgba(255,214,170,0.9)',
    hills: ['#8fd6a0', '#5cb98c', '#349a7a'],
    foliage: ['#2c8f6f', '#45ac86', '#78cfa0'],
    trunk: '#7a4a35',
    flowers: ['#ffb3d1', '#ffe08a', '#ffffff', '#c9b3ff'],
    cloud: '#fff5ee',
    extra: 'fireflies',
  },
};

const CLOUDS = [
  { x: '6%', y: '7%', w: 190, delay: '-6s', dur: '46s' },
  { x: '38%', y: '16%', w: 130, delay: '-20s', dur: '58s' },
  { x: '66%', y: '5%', w: 220, delay: '-12s', dur: '52s' },
  { x: '86%', y: '19%', w: 120, delay: '-30s', dur: '62s' },
] as const;

const SPARKLES = [
  { x: '14%', y: '30%', s: 14, d: '0s' },
  { x: '30%', y: '12%', s: 10, d: '1.1s' },
  { x: '54%', y: '26%', s: 12, d: '2.2s' },
  { x: '73%', y: '14%', s: 16, d: '0.6s' },
  { x: '90%', y: '34%', s: 11, d: '1.7s' },
] as const;

function Cloud({ w, color }: { w: number; color: string }) {
  return (
    <svg width={w} height={w * 0.46} viewBox="0 0 200 92" focusable="false">
      <g fill={color}>
        <ellipse cx="100" cy="66" rx="92" ry="22" />
        <circle cx="58" cy="50" r="30" />
        <circle cx="100" cy="36" r="36" />
        <circle cx="144" cy="52" r="26" />
      </g>
      <ellipse cx="100" cy="76" rx="80" ry="8" fill="#9ccfee" opacity=".25" />
    </svg>
  );
}

function Tree({ x, y, s, p, delay }: { x: number; y: number; s: number; p: Palette; delay: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-7" y="-4" width="14" height="46" rx="6" fill={p.trunk} />
      <g className="pl-sway" style={{ animationDelay: delay } as CSSProperties}>
        <circle cx="0" cy="-34" r="36" fill={p.foliage[0]} />
        <circle cx="-26" cy="-14" r="26" fill={p.foliage[1]} />
        <circle cx="26" cy="-14" r="26" fill={p.foliage[1]} />
        <circle cx="-8" cy="-46" r="16" fill={p.foliage[2]} opacity=".85" />
        <circle cx="20" cy="-30" r="9" fill={p.foliage[2]} opacity=".7" />
      </g>
    </g>
  );
}

function Flower({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0v26" stroke="#2f9e57" strokeWidth="3" strokeLinecap="round" />
      <g className="pl-sway">
        {[0, 72, 144, 216, 288].map((a) => (
          <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 7} cy={-Math.sin((a * Math.PI) / 180) * 7} r="5.2" fill={color} />
        ))}
        <circle r="4.2" fill="#ffd23f" stroke="#fff3b0" strokeWidth="1" />
      </g>
    </g>
  );
}

function Mushroom({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-5" y="-4" width="10" height="16" rx="4" fill="#fff4de" />
      <path d="M-18 -2a18 16 0 0 1 36 0Z" fill="#ff6f61" />
      <circle cx="-7" cy="-9" r="3" fill="#fff" />
      <circle cx="6" cy="-7" r="2.4" fill="#fff" />
    </g>
  );
}

const TREE_SPOTS = [
  { x: 90, y: 232, s: 1.15 },
  { x: 250, y: 252, s: 0.8 },
  { x: 1150, y: 236, s: 1.1 },
  { x: 1330, y: 226, s: 1.25 },
  { x: 1010, y: 262, s: 0.7 },
] as const;
const FLOWER_SPOTS = [
  [330, 300], [405, 316], [470, 296], [560, 322], [640, 306], [760, 318], [850, 300], [930, 320], [1060, 304], [1240, 318], [160, 312], [40, 300],
] as const;

export function Scene({ name = 'meadow' }: { name?: SceneName }) {
  const p = PALETTES[name];
  return (
    <div aria-hidden="true" data-scene={name} className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" style={{ background: `linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 48%, ${p.sky[2]} 100%)` }}>
      {/* sun glow */}
      <div className="absolute -right-10 -top-16 h-72 w-72 rounded-full sm:h-96 sm:w-96" style={{ background: `radial-gradient(circle, ${p.glow} 0%, rgba(255,255,255,0) 68%)` }} />
      {p.extra === 'rainbow' ? (
        <svg className="absolute left-[8%] top-[6%] h-44 w-[22rem] opacity-60 max-sm:hidden" viewBox="0 0 320 160" focusable="false">
          {['#ff6f6f', '#ffb347', '#ffe066', '#7fd67a', '#6cc4ff', '#a98bff'].map((c, i) => (
            <path key={c} d={`M${10 + i * 9} 160a${150 - i * 9} ${150 - i * 9} 0 0 1 ${300 - i * 18} 0`} fill="none" stroke={c} strokeWidth="9" />
          ))}
        </svg>
      ) : null}

      {CLOUDS.map((c, i) => (
        <div key={i} className="pl-drift absolute opacity-95" style={{ left: c.x, top: c.y, animationDuration: c.dur, animationDelay: c.delay } as CSSProperties}>
          <Cloud w={c.w} color={p.cloud} />
        </div>
      ))}

      {SPARKLES.map((s, i) => (
        <svg key={i} className="pl-twinkle absolute" style={{ left: s.x, top: s.y, width: s.s, height: s.s, animationDelay: s.d } as CSSProperties} viewBox="0 0 24 24" focusable="false">
          <path d="m12 1 2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6Z" fill="#fff" opacity=".9" />
        </svg>
      ))}

      {p.extra === 'fireflies'
        ? [18, 44, 63, 81].map((x, i) => <span key={x} className="pl-twinkle absolute h-2.5 w-2.5 rounded-full bg-yellow-200 shadow-[0_0_14px_5px_rgba(255,240,140,0.8)]" style={{ left: `${x}%`, bottom: `${22 + (i % 2) * 14}%`, animationDelay: `${i * 0.9}s` } as CSSProperties} />)
        : null}

      <svg className="absolute inset-x-0 bottom-0 h-[15rem] w-full sm:h-[19rem] lg:h-[22rem]" viewBox="0 0 1440 360" preserveAspectRatio="xMidYMax slice" focusable="false">
        <path d="M0 190C220 110 470 190 730 150S1210 120 1440 170V360H0Z" fill={p.hills[0]} />
        {TREE_SPOTS.slice(0, 2).map((t, i) => (
          <Tree key={`a${i}`} {...t} p={p} delay={`${-i * 1.3}s`} />
        ))}
        <path d="M0 250C300 180 560 262 860 214S1300 190 1440 232V360H0Z" fill={p.hills[1]} />
        {TREE_SPOTS.slice(2).map((t, i) => (
          <Tree key={`b${i}`} {...t} p={p} delay={`${-i * 0.9}s`} />
        ))}
        <path d="M0 304C260 262 540 318 820 292S1250 268 1440 296V360H0Z" fill={p.hills[2]} />
        {FLOWER_SPOTS.map(([x, y], i) => (
          <Flower key={i} x={x} y={y} s={0.7 + (i % 3) * 0.18} color={p.flowers[i % p.flowers.length] as string} />
        ))}
        {p.extra === 'mushrooms' ? (
          <>
            <Mushroom x={520} y={332} s={0.9} />
            <Mushroom x={1180} y={336} s={1.1} />
          </>
        ) : null}
      </svg>
    </div>
  );
}
