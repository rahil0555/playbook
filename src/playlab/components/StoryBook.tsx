import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { usePlayLab } from '../app/PlayLabContext';
import { springs } from '../motion/variants';

/**
 * A magical story book: a teal cover with a stitched spine, page edges, a gold picture window and a few twinkles.
 * It floats very gently. Children go in the window (usually an illustration).
 */
export function StoryBook({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { reducedMotion } = usePlayLab();
  return (
    <motion.div initial={{ rotate: -6, y: 16, opacity: 0 }} animate={{ rotate: -2, y: 0, opacity: 1 }} transition={springs.bouncy} className={`relative ${className}`}>
      <div className={reducedMotion ? '' : 'pl-float'}>
        {/* glow behind */}
        <span aria-hidden="true" className="absolute -inset-5 rounded-full bg-[radial-gradient(circle,rgba(255,236,150,0.8),rgba(255,236,150,0)_68%)]" />
        {/* pages peeking out at the right and bottom */}
        <span aria-hidden="true" className="absolute inset-0 translate-x-2 translate-y-2 rounded-[1.4rem] border-2 border-[#e9d8b0] bg-[repeating-linear-gradient(0deg,#fffaf0_0_4px,#eddcb4_4px_5px)]" />
        <div className="relative rounded-[1.4rem] border-[3px] border-[#0b5c4e] bg-gradient-to-b from-[#1fb89a] to-[#0f8a72] py-4 pl-9 pr-4 shadow-[inset_0_3px_0_rgba(255,255,255,0.35),0_8px_0_rgba(8,70,58,0.45),0_20px_26px_-10px_rgba(0,40,30,0.5)]">
          {/* stitched spine */}
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-6 rounded-l-[1.2rem] bg-[#0b6a58] shadow-[inset_-3px_0_0_rgba(0,0,0,0.18)]">
            <span className="absolute inset-y-3 left-1/2 w-0 -translate-x-1/2 border-l-[3px] border-dashed border-[#9fe8d4]" />
          </span>
          <span aria-hidden="true" className="pl-twinkle absolute -right-2 -top-3 text-2xl text-sun-300">✦</span>
          <span aria-hidden="true" className="pl-twinkle absolute -bottom-2 left-8 text-lg text-white" style={{ animationDelay: '1.4s' }}>✦</span>
          <div className="pl-frame grid place-items-center rounded-[1.2rem]">{children}</div>
        </div>
      </div>
    </motion.div>
  );
}
