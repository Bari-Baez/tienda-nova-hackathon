import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ensureFinished, gsap, ScrollTrigger } from '../../lib/gsapSetup';
import { EQUIPMENT } from '../../data/event';
import { EQUIPMENT_PHOTOS, findBrand } from '../../data/brands';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import s from './EquipmentCarousel.module.css';

const AUTOPLAY_MS = 6000;

const DEPTH = [
  { y: -0.72, x: -0.12, rot: -8, scale: 1.04, blur: 10, opacity: 0 },
  { y: -0.28, x: -0.06, rot: -4, scale: 0.92, blur: 5, opacity: 0.34 },
  { y: 0, x: 0, rot: 0, scale: 1, blur: 0, opacity: 1 },
  { y: 0.3, x: -0.03, rot: 4, scale: 0.88, blur: 5, opacity: 0.34 },
  { y: 0.72, x: -0.06, rot: 8, scale: 0.74, blur: 10, opacity: 0 },
];

function stepOf(index: number, current: number, total: number) {
  if (total <= 1) return 0;
  let step = index - current;
  if (step > total / 2) step -= total;
  if (step < -total / 2) step += total;
  return Math.max(-2, Math.min(2, step));
}

export default function EquipmentCarousel() {
  const root = useRef<HTMLElement>(null);
  const deck = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const currentRef = useRef(0);
  const directionRef = useRef(1);
  const positioned = useRef(false);
  const interactionTimer = useRef<number | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const suppressLink = useRef(false);

  const [current, setCurrent] = useState(0);
  const [inView, setInView] = useState(false);
  const [announce, setAnnounce] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const reduced = useReducedMotion();

  const items = EQUIPMENT;
  const total = items.length;
  const item = items[current] ?? items[0];
  const brand = item ? findBrand(item.brand) : undefined;
  const paused = hoverPaused || focusPaused || interactionPaused;

  const pauseBriefly = useCallback(() => {
    setInteractionPaused(true);
    if (interactionTimer.current) window.clearTimeout(interactionTimer.current);
    interactionTimer.current = window.setTimeout(() => {
      setInteractionPaused(false);
      interactionTimer.current = null;
    }, 4000);
  }, []);

  useEffect(
    () => () => {
      if (interactionTimer.current) window.clearTimeout(interactionTimer.current);
    },
    [],
  );

  const height = useRef(380);

  const place = useCallback(
    (index: number, animate: boolean) => {
      const measuredHeight = height.current;

      slides.current.forEach((slide, slideIndex) => {
        if (!slide) return;
        const step = stepOf(slideIndex, index, total);
        const depth = DEPTH[step + 2];
        const props = {
          xPercent: -50,
          yPercent: -50,
          x: depth.x * measuredHeight,
          y: depth.y * measuredHeight,
          rotation: depth.rot,
          scale: depth.scale,
          autoAlpha: depth.opacity,
          filter: reduced || depth.opacity === 0 ? 'none' : `blur(${depth.blur}px)`,
          zIndex: 10 - Math.abs(step),
        };

        if (animate && !reduced) {
          gsap.to(slide, { ...props, duration: 0.72, ease: 'power4.out', overwrite: 'auto' });
        } else {
          gsap.set(slide, props);
        }
      });
    },
    [reduced, total],
  );

  useLayoutEffect(() => {
    const measure = () => {
      height.current = deck.current?.offsetHeight ?? 380;
    };
    const onResize = () => {
      measure();
      place(currentRef.current, false);
    };

    measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [place]);

  useLayoutEffect(() => {
    place(current, positioned.current);
    positioned.current = true;
  }, [current, place]);

  useLayoutEffect(() => {
    const title = titleRef.current;
    if (!title || reduced) return;
    const chars = title.querySelectorAll('span');
    const tween = gsap.fromTo(
      chars,
      { yPercent: 75 * directionRef.current, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.55,
        ease: 'expo.out',
        stagger: 0.018,
        overwrite: true,
      },
    );
    return () => {
      tween.kill();
    };
  }, [current, reduced]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.25,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const goTo = useCallback(
    (next: number, fromUser: boolean) => {
      if (total < 2) return;
      const index = ((next % total) + total) % total;
      if (index === currentRef.current) return;

      directionRef.current = next > currentRef.current ? 1 : -1;
      currentRef.current = index;
      setCurrent(index);

      if (fromUser) {
        setAnnounce(true);
        pauseBriefly();
      }
    },
    [pauseBriefly, total],
  );

  useEffect(() => {
    if (reduced || paused || !inView || total < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') goTo(currentRef.current + 1, false);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [goTo, inView, paused, reduced, total]);

  useLayoutEffect(() => {
    const scope = root.current;
    if (!scope || reduced) return;
    let stop = () => {};

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: scope,
          start: 'top 76%',
          once: true,
          onEnter: () => {
            stop = ensureFinished(timeline, 2500);
          },
        },
      });
      timeline.from(`.${s.reveal}`, {
        opacity: 0,
        y: 24,
        duration: 0.75,
        ease: 'power3.out',
        stagger: 0.08,
        immediateRender: false,
      });
    }, scope);

    return () => {
      stop();
      context.revert();
    };
  }, [reduced]);

  useEffect(() => () => ScrollTrigger.refresh(), []);

  const onDeckKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      goTo(currentRef.current + 1, true);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      goTo(currentRef.current - 1, true);
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStart.current = { x: event.clientX, y: event.clientY };
    suppressLink.current = false;
    pauseBriefly();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    dragStart.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;

    suppressLink.current = true;
    goTo(currentRef.current + (dx < 0 ? 1 : -1), true);
  };

  const onPointerCancel = () => {
    dragStart.current = null;
    suppressLink.current = false;
  };

  const onProductClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!suppressLink.current) return;
    event.preventDefault();
    suppressLink.current = false;
  };

  if (!item) return null;

  return (
    <section className={s.section} id="equipos" ref={root} aria-labelledby="equipos-title">
      <div className={`shell ${s.inner}`}>
        <div className={s.info}>
          <p className={`micro ${s.reveal}`}>Tecnología presente en el evento</p>

          <h2 className={`${s.title} ${s.reveal}`} id="equipos-title">
            Exhibición y demostración
          </h2>

          <p className={`${s.sectionLead} ${s.reveal}`}>
            Conozca las soluciones de Epson, Konica Minolta, Valloy y TECHKON presentes en el evento.
          </p>

          <div className={s.active}>
            <div className={s.statusRow}>
              <span className={s.category}>{item.category}</span>
            </div>

            {brand && (
              <p className={s.brandRow} aria-hidden="true">
                <img
                  className={`${s.brandLogo} ${brand.whiteBacking ? s.whiteBacking : ''}`}
                  src={brand.logo}
                  alt=""
                  loading="lazy"
                />
              </p>
            )}

            <h3
              className={s.brandTitle}
              ref={titleRef}
              aria-label={item.brand}
              aria-live={announce ? 'polite' : undefined}
            >
              {Array.from(item.brand).map((char, index) => (
                <span aria-hidden="true" key={`${item.id}-${index}`}>
                  {char === ' ' ? ' ' : char}
                </span>
              ))}
            </h3>

            <p className={s.modelName}>
              <span>Modelo</span>
              {item.model}
            </p>

            <p className={s.description}>{item.description}</p>
          </div>

          <ol className={`${s.list} ${s.reveal}`}>
            {items.map((equipment, index) => (
              <li key={equipment.id}>
                <button
                  type="button"
                  className={`${s.chip} ${index === current ? s.chipActive : ''}`}
                  onClick={() => goTo(index, true)}
                  aria-pressed={index === current}
                >
                  <span className={s.chipIndex}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={s.chipCopy}>
                    <strong>{equipment.brand}</strong>
                    <span>{equipment.model}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div
          className={`${s.deckWrap} ${s.reveal}`}
          id="equipos-carrusel"
          onMouseEnter={() => setHoverPaused(true)}
          onMouseLeave={() => setHoverPaused(false)}
          onFocusCapture={() => setFocusPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusPaused(false);
          }}
        >
          <div
            className={s.deck}
            ref={deck}
            role="group"
            aria-roledescription="carrusel"
            aria-label={`${item.brand} ${item.model}, equipo ${current + 1} de ${total}`}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onKeyDown={onDeckKeyDown}
            style={{ ['--accent' as string]: item.accent }}
          >
            <span className={s.wash} aria-hidden="true" />

            {items.map((equipment, index) => {
              const photo = EQUIPMENT_PHOTOS[equipment.id];
              const equipmentBrand = findBrand(equipment.brand);
              const active = index === current;

              return (
                <div
                  className={s.slide}
                  key={equipment.id}
                  ref={(node) => {
                    slides.current[index] = node;
                  }}
                  aria-hidden={!active}
                >
                  <div className={s.slideHead}>
                    {equipmentBrand ? (
                      <img
                        className={`${s.slideLogo} ${equipmentBrand.whiteBacking ? s.whiteBacking : ''}`}
                        src={equipmentBrand.logo}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span className={s.slideBrand}>{equipment.brand}</span>
                    )}
                    <span className={s.slideIndex}>{String(index + 1).padStart(2, '0')}</span>
                  </div>

                  <a
                    className={s.productLink}
                    href={equipment.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={active ? 0 : -1}
                    aria-label={`Ver ficha oficial de ${equipment.brand} ${equipment.model} en una pestaña nueva`}
                    onClick={onProductClick}
                  >
                    <div className={s.slideBody}>
                      {photo ? (
                        <img
                          className={s.photo}
                          src={photo}
                          alt={`${equipment.brand} ${equipment.model}`}
                          width="1200"
                          height="900"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className={s.imageFallback}>{equipment.model}</span>
                      )}

                      <span className={s.externalCue}>
                        Ver ficha oficial
                        <span aria-hidden="true">↗</span>
                      </span>
                    </div>
                  </a>

                  <div className={s.slideBar} aria-hidden="true">
                    <i style={{ background: 'var(--c)' }} />
                    <i style={{ background: 'var(--m)' }} />
                    <i style={{ background: 'var(--y)' }} />
                    <i style={{ background: 'var(--ink)' }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className={s.controls}>
            <button
              type="button"
              className={s.arrow}
              onClick={() => goTo(currentRef.current - 1, true)}
              aria-label="Equipo anterior"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            <span className={s.counter} aria-live="polite">
              <b className="tnum">{String(current + 1).padStart(2, '0')}</b>
              <i />
              <span className="tnum">{String(total).padStart(2, '0')}</span>
            </span>

            <button
              type="button"
              className={s.arrow}
              onClick={() => goTo(currentRef.current + 1, true)}
              aria-label="Siguiente equipo"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
