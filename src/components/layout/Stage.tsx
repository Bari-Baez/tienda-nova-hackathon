import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import { ensureFinished, Flip, gsap } from '../../lib/gsapSetup';
import { EVENT } from '../../data/event';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import BrandMarquee from './BrandMarquee';
import Logo from './Logo';
import s from './Stage.module.css';

export type StageMode = 'invitacion' | 'registro';

export interface StageApi {
  /** Mide el estado actual ANTES de que React cambie el modo. */
  capture: () => void;
}

interface Props {
  mode: StageMode;
  /** El preloader ya se apartó: se puede animar la entrada. */
  ready: boolean;
  apiRef: MutableRefObject<StageApi | null>;
  onClose: () => void;
  children: ReactNode;
}

const FLIP_PROPS = 'fontSize,letterSpacing,borderRadius,backgroundColor,color,boxShadow';

/**
 * El escenario: cabecera, titular y cuerpo. Al pasar a registro, el titular se
 * contrae y el botón de confirmar se convierte en el pliego del formulario.
 * Los dos elementos llevan data-flip-id; GSAP Flip hace el resto.
 */
export default function Stage({ mode, ready, apiRef, onClose, children }: Props) {
  const root = useRef<HTMLElement>(null);
  const pending = useRef<Flip.FlipState | null>(null);
  const first = useRef(true);
  const reduced = useReducedMotion();

  /* --- Entrada, cuando el preloader se aparta --- */
  useLayoutEffect(() => {
    if (!ready || reduced || !root.current) return;

    const items = root.current.querySelectorAll('[data-stage-in]');
    const tl = gsap.timeline();
    tl.from(items, {
      opacity: 0,
      y: 24,
      duration: 0.85,
      ease: 'power3.out',
      stagger: 0.08,
    });

    const stop = ensureFinished(tl);

    return () => {
      stop();
      // revert(), no kill(): kill() deja el opacity:0 pegado en línea y el
      // hero se queda invisible si React vuelve a montar el efecto.
      tl.revert();
    };
  }, [ready, reduced]);

  const capture = useCallback(() => {
    if (reduced || !root.current) return;
    pending.current = Flip.getState(root.current.querySelectorAll('[data-flip-id]'), {
      props: FLIP_PROPS,
    });
  }, [reduced]);

  useEffect(() => {
    apiRef.current = { capture };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, capture]);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    const state = pending.current;
    pending.current = null;

    const content = root.current?.querySelector<HTMLElement>('[data-flip-content]');

    if (!state || reduced) {
      if (content) gsap.set(content, { opacity: 1 });
      return;
    }

    const flip = Flip.from(state, {
      duration: 0.72,
      ease: 'power3.inOut',
      props: FLIP_PROPS,
      nested: true,
    });

    // El contenido del pliego aparece cuando la caja ya casi terminó de crecer:
    // así nunca se ve aplastado durante el vuelo.
    const tween = content
      ? gsap.fromTo(
          content,
          { opacity: 0 },
          { opacity: 1, duration: 0.32, delay: 0.34, ease: 'power2.out' },
        )
      : null;

    // Seguro: si el navegador congela las animaciones, el estado final se aplica igual.
    const safety = window.setTimeout(() => {
      if (flip.progress() < 1) flip.progress(1);
      if (content) gsap.set(content, { opacity: 1 });
    }, 1200);

    return () => {
      window.clearTimeout(safety);
      flip.kill();
      tween?.kill();
      if (content) gsap.set(content, { opacity: 1 });
    };
  }, [mode, reduced]);

  const isForm = mode === 'registro';

  return (
    <section className={`${s.stage} ${isForm ? s.stageForm : ''}`} ref={root}>
      <BrandMarquee damped={isForm} />

      <div className={`shell ${s.inner}`}>
        <header className={s.bar} data-stage-in>
          <Logo compact={isForm} />

          {isForm && (
            <button type="button" className={s.close} onClick={onClose}>
              Volver
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="none">
                <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          )}
        </header>

        <div className={s.body}>
          <div className={s.titleBlock} data-flip-id="pg-title" data-stage-in>
            {!isForm && (
              <p className={`micro ${s.kicker}`}>
                <span className={s.bars} aria-hidden="true">
                  <i style={{ background: 'var(--c)' }} />
                  <i style={{ background: 'var(--m)' }} />
                  <i style={{ background: 'var(--y)' }} />
                  <i style={{ background: 'var(--ink)' }} />
                </span>
                {EVENT.organizer} le invita
              </p>
            )}

            <h1 className={s.title}>
              Demostración de equipos de <em>impresión digital</em>
            </h1>
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
