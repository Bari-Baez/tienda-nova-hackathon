import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';

/**
 * Solo dos plugins de arranque, y cada uno se gana su sitio:
 *   ScrollTrigger — apariciones y velocidad del marquee según el scroll
 *   Flip          — la invitación se convierte en formulario sin cambiar de pantalla
 *
 * MorphSVG se carga aparte y solo en escritorio (ver BrandMarquee): son 25 KB
 * que en un móvil no pintarían nada.
 *
 * Las letras del preloader y el trazado del check van a mano: menos peso.
 */
gsap.registerPlugin(ScrollTrigger, Flip);

/**
 * En móvil, mostrar u ocultar la barra del navegador dispara un `resize` que
 * obliga a ScrollTrigger a recalcularlo todo en pleno scroll: es la causa más
 * común de tirones al deslizar con el dedo. Con esto solo recalcula cuando
 * cambia la orientación, que es cuando de verdad cambia el diseño.
 */
ScrollTrigger.config({ ignoreMobileResize: true });

/**
 * Garantiza el estado final de una animación aunque el navegador congele el
 * rAF (pestaña en segundo plano). Sin esto, una entrada con `from` puede dejar
 * contenido invisible: exactamente el fallo que tenía la primera versión.
 */
export function ensureFinished(tl: gsap.core.Timeline, after = 2200): () => void {
  const finish = () => {
    if (tl.progress() < 1) tl.progress(1);
  };

  const timer = window.setTimeout(finish, after);
  const onVisible = () => {
    if (document.visibilityState === 'visible' && tl.progress() < 1 && tl.paused()) finish();
  };

  document.addEventListener('visibilitychange', onVisible);

  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

export { gsap, ScrollTrigger, Flip };
