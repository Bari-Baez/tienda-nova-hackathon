import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../../lib/gsapSetup';
import { CONTACT, EVENT, MAPS_URL, WAZE_URL } from '../../data/event';
import { useSectionReveal } from '../../hooks/useSectionReveal';
import mapa from '../../assets/mapa-hotel-santiago.webp';
import PrimaryButton from '../ui/PrimaryButton';
import s from './EventDetails.module.css';

interface Props {
  onStart: () => void;
  registered: boolean;
}

export default function EventDetails({ onStart, registered }: Props) {
  const root = useRef<HTMLElement>(null);
  useSectionReveal(root, '.reveal', { y: 24, stagger: 0.07 });

  useLayoutEffect(() => {
    const scope = root.current;
    if (!scope) return;

    const mm = gsap.matchMedia();

    // Las planchas del "09" entran en registro con el scroll.
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const plates = gsap.utils.toArray<HTMLElement>(`.${s.dayPlate}`, scope);
      if (!plates.length) return;

      gsap.fromTo(
        plates,
        { xPercent: (i) => (i - 1) * 3, yPercent: (i) => (i - 1) * 1.5 },
        {
          xPercent: 0,
          yPercent: 0,
          ease: 'none',
          scrollTrigger: { trigger: scope, start: 'top 85%', end: 'center 50%', scrub: 0.6 },
        },
      );
    });

    return () => mm.revert();
  }, []);

  return (
    <section className={s.details} id="detalles" ref={root} aria-labelledby="detalles-title">
      <div className={`shell ${s.inner}`}>
        <h2 className="srOnly" id="detalles-title">
          Cuándo y dónde
        </h2>

        {/* --- Cuándo --- */}
        <div className={s.when}>
          <p className={`micro reveal ${s.weekday}`}>{EVENT.weekday}</p>

          <div className={s.day} aria-hidden="true">
            <span className={`${s.dayPlate} ${s.dayC}`}>{EVENT.day}</span>
            <span className={`${s.dayPlate} ${s.dayM}`}>{EVENT.day}</span>
            <span className={s.dayInk}>{EVENT.day}</span>
          </div>

          <p className={`reveal ${s.monthYear}`}>{EVENT.monthYear}</p>
          <p className="srOnly">{EVENT.dateLong}</p>

          <dl className={`reveal ${s.schedule}`}>
            <div>
              <dt>
                <span className={s.tick} style={{ background: 'var(--c)' }} aria-hidden="true" />
                {EVENT.exhibitionLabel}
              </dt>
              <dd className="tnum">{EVENT.exhibitionHours}</dd>
            </div>
            <div>
              <dt>
                <span className={s.tick} style={{ background: 'var(--m)' }} aria-hidden="true" />
                {EVENT.cocktailLabel}
              </dt>
              <dd className="tnum">{EVENT.cocktailHours}</dd>
            </div>
          </dl>
        </div>

        {/* --- Dónde --- */}
        <div className={s.where}>
          <div className={`reveal ${s.venueBlock}`}>
            <p className="micro">Dónde</p>
            <p className={s.venue}>{EVENT.venue}</p>
            <p className={s.venueSub}>{EVENT.venueBrand}</p>
            <p className={s.room}>{EVENT.room}</p>
            <p className={s.address}>
              {EVENT.street} · {EVENT.city}
            </p>
          </div>

          <a
            className={`reveal ${s.map}`}
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ver ${EVENT.venue} en Google Maps`}
          >
            <img
              className={s.mapImage}
              src={mapa}
              alt={`Mapa de la zona del ${EVENT.venue}, en ${EVENT.street}`}
              loading="lazy"
              decoding="async"
              width={1000}
              height={500}
            />
            <span className={s.pin} aria-hidden="true">
              <span className={s.pinDot} />
            </span>
            <span className={s.mapLabel}>
              {EVENT.venue}
              <b>Ver en el mapa ↗</b>
            </span>
            <span className={s.mapCredit}>© OpenStreetMap</span>
          </a>

          <div className={`reveal ${s.routes}`}>
            <a className={s.route} href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
                <path
                  d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.7" />
              </svg>
              Google Maps
            </a>
            <a className={s.route} href={WAZE_URL} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
                <path d="M3 11.5 21 4l-7.5 17-2.2-7.3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
              Waze
            </a>
          </div>
        </div>

        {/* --- Contacto --- */}
        <div className={`reveal ${s.contact}`}>
          <p className="micro">Contacto para citas</p>
          <div className={s.contactRow}>
            <a className={s.contactItem} href={CONTACT.phoneHref}>
              {CONTACT.phone}
              <span>Ext. {CONTACT.phoneExt}</span>
            </a>
            <a
              className={s.contactItem}
              href={CONTACT.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {CONTACT.whatsapp}
              <span>WhatsApp</span>
            </a>
            <a className={s.contactItem} href={CONTACT.emailHref}>
              {CONTACT.email}
              <span>Correo</span>
            </a>
          </div>
        </div>

        {/* --- Cierre --- */}
        <div className={`reveal ${s.cta}`}>
          <p className={s.ctaText}>
            Su lugar toma menos de un minuto.
            <span>Confirme ahora y reciba los detalles por correo.</span>
          </p>
          <PrimaryButton onClick={onStart} data-cta="detalles">
            {registered ? 'Ver mi confirmación' : 'Confirmar mi asistencia'}
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}
