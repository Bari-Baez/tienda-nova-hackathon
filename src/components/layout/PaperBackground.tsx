import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../../lib/gsapSetup';
import s from './PaperBackground.module.css';

/**
 * El papel: grano, una trama de semitono muy tenue y dos lavados de tinta que
 * respiran despacio. Todo en `multiply`, como tinta sobre pliego.
 * Sin filtros costosos: el difuminado va dentro del degradado.
 */
export default function PaperBackground() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const washes = gsap.utils.toArray<HTMLElement>(`.${s.wash}`, root.current);
      washes.forEach((wash, i) => {
        gsap.to(wash, {
          xPercent: gsap.utils.random(-8, 8),
          yPercent: gsap.utils.random(-6, 6),
          scale: gsap.utils.random(0.94, 1.1),
          duration: gsap.utils.random(22, 34),
          delay: i * 1.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });
    });

    return () => mm.revert();
  }, []);

  return (
    <div className={s.root} ref={root} aria-hidden="true">
      <span className={`${s.wash} ${s.washCyan}`} />
      <span className={`${s.wash} ${s.washMagenta}`} />
      <span className={`${s.wash} ${s.washYellow}`} />
      <div className={s.halftone} />
      <div className={s.grain} />
    </div>
  );
}
