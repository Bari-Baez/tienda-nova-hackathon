import { useLayoutEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../../lib/gsapSetup';
import { BRANDS } from '../../data/brands';
import s from './BrandMarquee.module.css';

/**
 * El río de muestras: pliegos impresos y manchas de tinta desfilando despacio
 * detrás de la invitación. El scroll le añade velocidad, nunca lo secuestra.
 *
 * Los logotipos van en muestras rectangulares y sin recortar (una marca no se
 * mutila); las formas orgánicas quedan para la tinta, que sí muta.
 */

interface InkItem {
  kind: 'ink';
  shape: 0 | 1 | 2;
  color: string;
  depth: 'back' | 'front';
}

interface BrandItem {
  kind: 'brand';
  index: number;
  depth: 'back' | 'front';
}

type Item = InkItem | BrandItem;

const INK_SHAPES: InkItem['shape'][] = [0, 1, 2, 1];
const INK_COLORS = ['var(--c)', 'var(--m)', 'var(--y)', 'var(--ink)'];

/** Cada marca genera su propia muestra y una mancha; no hay índices manuales. */
const ITEMS: Item[] = BRANDS.flatMap((_, index) => [
  { kind: 'brand', index, depth: index % 3 === 1 ? 'back' : 'front' },
  {
    kind: 'ink',
    shape: INK_SHAPES[index % INK_SHAPES.length],
    color: INK_COLORS[index % INK_COLORS.length],
    depth: index % 2 === 0 ? 'back' : 'front',
  },
]);

/** Formas de mancha y su forma alterna: MorphSVG interpola entre ambas. */
const SHAPES = [
  {
    from: 'M300,120 C392,120 470,182 470,278 C470,374 404,470 300,470 C196,470 130,382 130,286 C130,190 208,120 300,120 Z',
    to: 'M300,104 C408,116 458,196 462,290 C466,384 386,486 292,478 C198,470 138,392 132,296 C126,200 192,92 300,104 Z',
  },
  {
    from: 'M300,110 C400,130 486,178 470,288 C454,398 372,478 286,470 C200,462 118,392 122,290 C126,188 200,90 300,110 Z',
    to: 'M300,132 C378,112 462,206 466,300 C470,394 380,462 296,466 C212,470 134,386 134,292 C134,198 222,152 300,132 Z',
  },
  {
    from: 'M300,126 C386,126 464,190 464,292 C464,394 388,472 300,472 C212,472 136,394 136,292 C136,190 214,126 300,126 Z',
    to: 'M300,112 C398,124 470,206 458,304 C446,402 376,484 288,470 C200,456 142,376 142,286 C142,196 202,100 300,112 Z',
  },
];

interface Props {
  /** Con el registro abierto el río baja el ritmo y se aparta. */
  damped?: boolean;
}

export default function BrandMarquee({ damped = false }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const loop = useRef<gsap.core.Tween | null>(null);

  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tween = gsap.to(el, {
        xPercent: -50,
        duration: 60,
        ease: 'none',
        repeat: -1,
      });
      loop.current = tween;

      // Una sola interpolación reutilizable para la velocidad. Antes se creaba
      // un tween nuevo en CADA evento de scroll: decenas por segundo.
      const acelerar = gsap.quickTo(tween, 'timeScale', {
        duration: 0.3,
        ease: 'power2.out',
      });

      // El scroll empuja el río; al detenerse vuelve solo a su ritmo.
      const resetTo = gsap.delayedCall(0.5, () => acelerar(1)).pause();

      const trigger = ScrollTrigger.create({
        onUpdate: (self) => {
          acelerar(gsap.utils.clamp(1, 5, 1 + Math.abs(self.getVelocity()) / 700));
          resetTo.restart(true);
        },
      });

      // Fuera de pantalla no se anima nada: el hero deja de consumir
      // fotogramas en cuanto el invitado baja a los equipos.
      const visibilidad = ScrollTrigger.create({
        trigger: el.parentElement as HTMLElement,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          if (self.isActive) tween.play();
          else tween.pause();
        },
      });

      return () => {
        trigger.kill();
        visibilidad.kill();
        resetTo.kill();
        tween.kill();
        loop.current = null;
      };
    });

    // El morphing solo donde sobra músculo: recortar formas cada fotograma es
    // caro. El plugin (25 KB) se descarga aparte y nunca llega al móvil.
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      let tweens: gsap.core.Tween[] = [];
      let cancelled = false;

      let visibilidad: ScrollTrigger | null = null;

      void import('gsap/MorphSVGPlugin').then(({ MorphSVGPlugin }) => {
        if (cancelled) return;
        gsap.registerPlugin(MorphSVGPlugin);
        tweens = SHAPES.map((shape, i) =>
          gsap.to(`#pgBlob${i} path`, {
            morphSVG: shape.to,
            duration: 7 + i * 1.5,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          }),
        );

        // Deformar recortes SVG es lo más caro de la página: solo mientras
        // el hero está a la vista.
        visibilidad = ScrollTrigger.create({
          trigger: el.parentElement as HTMLElement,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => tweens.forEach((t) => (self.isActive ? t.play() : t.pause())),
        });
      });

      return () => {
        cancelled = true;
        visibilidad?.kill();
        tweens.forEach((t) => t.kill());
      };
    });

    return () => mm.revert();
  }, []);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    gsap.to(el, {
      opacity: damped ? 0.28 : 1,
      duration: 0.6,
      ease: 'power2.out',
    });
    if (loop.current) {
      gsap.to(loop.current, { timeScale: damped ? 0.25 : 1, duration: 0.8, overwrite: true });
    }
  }, [damped]);

  const renderItem = (item: Item, key: string) => {
    if (item.kind === 'brand') {
      const brand = BRANDS[item.index];
      if (!brand) return null;
      return (
        <div className={`${s.item} ${s[item.depth]} ${s.sample}`} key={key}>
          <div className={s.sampleInner}>
            <img
              className={`${s.logo} ${brand.whiteBacking ? s.whiteBacking : ''}`}
              src={brand.logo}
              alt=""
              decoding="async"
            />
          </div>
          <div className={s.sampleBar} aria-hidden="true">
            <i style={{ background: 'var(--c)' }} />
            <i style={{ background: 'var(--m)' }} />
            <i style={{ background: 'var(--y)' }} />
            <i style={{ background: 'var(--ink)' }} />
          </div>
        </div>
      );
    }

    return (
      <div className={`${s.item} ${s[item.depth]} ${s.ink}`} key={key}>
        <svg viewBox="0 0 600 600" className={s.inkSvg}>
          <g clipPath={`url(#pgBlob${item.shape})`}>
            <rect width="600" height="600" fill={item.color} opacity="0.42" />
            <rect width="600" height="600" fill={`url(#pgDots${item.shape})`} opacity="0.5" />
          </g>
        </svg>
      </div>
    );
  };

  return (
    <div className={s.root} ref={root} aria-hidden="true">
      {/* Definiciones compartidas: se muta una vez y lo heredan todas las copias. */}
      <svg className={s.defs} width="0" height="0" focusable="false">
        <defs>
          {SHAPES.map((shape, i) => (
            <clipPath id={`pgBlob${i}`} key={i} clipPathUnits="userSpaceOnUse">
              <path d={shape.from} />
            </clipPath>
          ))}
          {SHAPES.map((_, i) => (
            <pattern
              id={`pgDots${i}`}
              key={`p${i}`}
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="7" cy="7" r={3 + i} fill="rgba(20,17,13,.5)" />
            </pattern>
          ))}
        </defs>
      </svg>

      <div className={s.staticGrid}>
        {BRANDS.map((_, index) =>
          renderItem({ kind: 'brand', index, depth: 'front' }, `static-${index}`),
        )}
      </div>

      <div className={s.track} ref={track}>
        {ITEMS.map((item, i) => renderItem(item, `a-${i}`))}
        {ITEMS.map((item, i) => renderItem(item, `b-${i}`))}
      </div>
    </div>
  );
}
