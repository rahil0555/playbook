import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { ACCENTS } from '../lib/accents';
import { tapResponse } from '../motion/variants';
import type { AccentName } from '../types/learning';
import { Icon, type IconName } from './Icon';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  accent?: AccentName;
  size?: 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
}

/** Large, chunky, touch-friendly button. Minimum 48px tall. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', accent = 'brand', size = 'md', icon, iconRight, children, className = '', disabled, type = 'button', ...rest },
  ref,
) {
  const a = ACCENTS[accent];
  const look =
    variant === 'primary'
      ? `${a.solid} ${a.solidText} pl-chunk`
      : variant === 'secondary'
        ? `bg-white ${a.text} border-2 ${a.border} pl-chunk`
        : `bg-transparent ${a.text} hover:bg-black/5`;
  const dim = size === 'lg' ? 'min-h-[3.75rem] px-7 text-xl gap-3' : 'min-h-[3rem] px-5 text-base gap-2';
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      {...(disabled ? {} : tapResponse)}
      className={`inline-flex items-center justify-center rounded-full font-display font-semibold leading-none transition-opacity disabled:opacity-45 ${look} ${dim} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === 'lg' ? 26 : 22} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'lg' ? 26 : 22} /> : null}
    </motion.button>
  );
});
