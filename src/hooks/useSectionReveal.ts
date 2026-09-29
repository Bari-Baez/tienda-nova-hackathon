import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import { ensureFinished, gsap } from '../lib/gsapSetup';

interface Options {
  y?: number;
  stagger?: number;
  start?: string;
}

/**
 * Aparición sobria al entrar en pantalla.
 *
 * El seguro se arma cuando el disparador entra —no antes—, de modo que la
 * animación se ve si todo va bien, y el contenido aparece igual si el navegador
 * congela los fotogramas. Una sección nunca puede quedarse invisible.
 */
export function useSectionReveal(
  ref: RefObject<HTMLElement | null>,
  selector: string,
  options: Options = {},
) {
  useLayoutEffect(() => {
    const scope = ref.current;
    if (!scope) return;

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const items = gsap.utils.toArray<HTMLElement>(selector, scope);
      if (!items.length) return;

      let stop = () => {};

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scope,
          start: options.start ?? 'top 80%',
          once: true,
          onEnter: () => {
            stop = ensureFinished(tl, 2500);
          },
        },
      });

      tl.from(items, {
        opacity: 0,
        y: options.y ?? 26,
        duration: 0.8,
        ease: 'power3.out',
        stagger: options.stagger ?? 0.08,
        // Clave: sin immediateRender el contenido NO se oculta al crearse.
        // Si el disparador nunca llega a ejecutarse, se ve sin animación,
        // que es infinitamente mejor que no verse.
        immediateRender: false,
      });

      return () => stop();
    });

    return () => mm.revert();
  }, [ref, selector, options.y, options.stagger, options.start]);
}
