import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import s from './PrimaryButton.module.css';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  full?: boolean;
  children: ReactNode;
}

/**
 * Un solo elemento, sin capas internas: las planchas de color son sombras
 * desplazadas que entran en registro al pasar el cursor. Así el botón también
 * puede participar en las transformaciones de GSAP Flip sin conflictos.
 */
const PrimaryButton = forwardRef<HTMLButtonElement, Props>(function PrimaryButton(
  { variant = 'primary', full = false, children, className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${s.btn} ${variant === 'ghost' ? s.ghost : s.primary} ${full ? s.full : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

export default PrimaryButton;
