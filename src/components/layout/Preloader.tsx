import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from '../../lib/gsapSetup';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import s from './Preloader.module.css';

const WORDS = ['PLAZA', 'GRÁFICA'];
const PLATES = ['var(--c)', 'var(--m)', 'var(--y)', 'var(--k)'];

/** Techo duro: pase lo que pase con las fuentes, a los 2.2 s se entra al sitio. */
const MAX_MS = 2200;

interface Props {
  onDone: () => void;
}

export default function Preloader({ onDone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const reduced = useReducedMotion();

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;

    const el = root.current;
    if (!el || reduced) {
      onDone();
      return;
    }

    // El pliego se levanta y descubre la página.
    gsap.to(el, {
      yPercent: -100,
      duration: 0.72,
      ease: 'power3.inOut',
      onComplete: onDone,
    });

    // Y pase lo que pase con la animación, la portada se retira igual.
    // Quedarse encerrado en un preloader es el peor fallo posible.
    window.setTimeout(onDone, 820);
  }, [onDone, reduced]);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (reduced) return;

    const ctx = gsap.context(() => {
      const letters = gsap.utils.toArray<HTMLElement>(`.${s.letter}`);
      const small = window.matchMedia('(max-width: 640px)').matches;

      const tl = gsap.timeline();

      tl.from(letters, {
        y: () => gsap.utils.random(-130, 130),
        opacity: 0,
        filter: small ? 'blur(14px)' : 'blur(26px)',
        duration: 0.95,
        ease: 'power3.out',
        stagger: { each: 0.032, from: 'random' },
      })
        // Las cuatro planchas se imprimen una tras otra.
        .from(
          `.${s.plate}`,
          { scaleX: 0, duration: 0.26, ease: 'power2.out', stagger: 0.09 },
          0.25,
        )
        .from(`.${s.caption}`, { opacity: 0, duration: 0.4 }, 0.4);
    }, el);

    return () => ctx.revert();
  }, [reduced]);

  useEffect(() => {
    let cancelled = false;

    // Salir cuando las fuentes estén listas (para que las letras no salten),
    // pero nunca más tarde del techo.
    const minWait = reduced ? 0 : 1250;
    const start = Date.now();

    const ready = document.fonts?.ready ?? Promise.resolve();
    void ready.then(() => {
      if (cancelled) return;
      const rest = Math.max(0, minWait - (Date.now() - start));
      window.setTimeout(finish, rest);
    });

    const hardStop = window.setTimeout(finish, MAX_MS);

    // Se puede saltar: nadie debería esperar a una animación para registrarse.
    const skip = () => finish();
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);

    return () => {
      cancelled = true;
      window.clearTimeout(hardStop);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
    };
  }, [finish, reduced]);

  return (
    <div className={s.root} ref={root} role="status" aria-label="Cargando la invitación">
      <div className={s.center}>
        <p className={s.word} aria-hidden="true">
          {WORDS.map((word, wi) => (
            <span className={s.line} key={word}>
              {Array.from(word).map((char, i) => (
                <span className={s.letter} key={`${wi}-${i}`}>
                  {char}
                </span>
              ))}
            </span>
          ))}
        </p>

        <div className={s.plates} aria-hidden="true">
          {PLATES.map((color) => (
            <span className={s.plate} key={color} style={{ background: color }} />
          ))}
        </div>

        <p className={`micro ${s.caption}`}>Demostración de equipos · 09.09.2026</p>
      </div>
    </div>
  );
}
