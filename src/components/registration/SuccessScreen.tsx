import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../../lib/gsapSetup';
import { APPOINTMENT_SLOTS, CONTACT, EVENT, GOOGLE_CALENDAR_URL, MAPS_URL } from '../../data/event';
import { downloadIcs } from '../../lib/calendar';
import { track } from '../../lib/analytics';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { RegistrationData } from '../../types';
import PrimaryButton from '../ui/PrimaryButton';
import s from './Success.module.css';

interface Props {
  data: RegistrationData;
  restoredCompany: string | null;
  onClose: () => void;
  onNew: () => void;
}

export default function SuccessScreen({ data, restoredCompany, onClose, onNew }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const check = useRef<SVGPathElement>(null);
  const reduced = useReducedMotion();

  const appointmentAttendees = data.attendees.filter((attendee) => attendee.visitType === 'contacto');
  const confirmedAttendees = data.attendees.filter((attendee) => attendee.name);
  const attendeeNames = confirmedAttendees.map((attendee) => attendee.name);
  const isGroup = attendeeNames.length > 1;

  useLayoutEffect(() => {
    const scope = root.current;
    const path = check.current;
    if (!scope) return;

    const length = path ? path.getTotalLength() : 0;
    if (path) {
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = reduced ? '0' : String(length);
    }

    if (reduced) return;

    let safety = 0;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Seguro: la confirmación nunca puede quedarse invisible.
      safety = window.setTimeout(() => {
        if (tl.progress() < 1) tl.progress(1);
      }, 2000);

      // Las cuatro planchas caen y entran en registro: se imprime la confirmación.
      tl.from(`.${s.plate}`, {
        x: () => gsap.utils.random(-120, 120),
        y: () => gsap.utils.random(-80, 80),
        rotate: () => gsap.utils.random(-35, 35),
        opacity: 0,
        duration: 0.7,
        ease: 'power4.out',
        stagger: 0.08,
      })
        .to(path, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.inOut' }, '-=0.15')
        .from(`.${s.reveal}`, { opacity: 0, y: 16, duration: 0.55, stagger: 0.07 }, '-=0.45');
    }, scope);

    return () => {
      window.clearTimeout(safety);
      ctx.revert();
    };
  }, [reduced]);

  return (
    <div className={s.root} ref={root}>
      <div className={s.stamp} aria-hidden="true">
        <span className={`${s.plate} ${s.plateC}`} />
        <span className={`${s.plate} ${s.plateM}`} />
        <span className={`${s.plate} ${s.plateY}`} />
        <span className={`${s.plate} ${s.plateK}`} />
        <svg className={s.check} viewBox="0 0 48 48" fill="none">
          <path
            ref={check}
            d="M14 25l7 7 14-15"
            stroke="var(--paper)"
            strokeWidth="3.4"
            strokeLinecap="square"
          />
        </svg>
      </div>

      <h2 className={`${s.title} ${s.reveal}`}>
        {isGroup ? '¡Las asistencias están confirmadas!' : '¡Su asistencia está confirmada!'}
      </h2>

      <p className={`${s.text} ${s.reveal}`}>
        {isGroup
          ? `Registramos correctamente a ${attendeeNames.length} invitados. Cada persona recibirá su confirmación por correo.`
          : 'Gracias por registrarse. Será un placer recibirle en nuestra Demostración de Equipos de Impresión Digital.'}
      </p>

      {attendeeNames.length > 0 && (
        <div className={`${s.attendees} ${s.reveal}`}>
          <span className="micro">Invitados confirmados</span>
          <ul>
            {confirmedAttendees.map((attendee) => (
              <li key={attendee.id}>
                {attendee.name}
                <span>{attendee.jobTitle}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {restoredCompany && (
        <p className={`${s.note} ${s.reveal}`}>
          Ya tenemos el registro de <strong>{restoredCompany}</strong> desde este dispositivo.
        </p>
      )}

      <dl className={`${s.recap} ${s.reveal}`}>
        <div>
          <dt className="micro">Cuándo</dt>
          <dd className="tnum">
            <strong>{EVENT.dateLong}</strong>
            <span>
              {EVENT.exhibitionLabel} {EVENT.exhibitionHours}
            </span>
            <span>
              {EVENT.cocktailLabel} {EVENT.cocktailHours}
            </span>
          </dd>
        </div>
        <div>
          <dt className="micro">Dónde</dt>
          <dd>
            <strong>{EVENT.venue}</strong>
            <span>{EVENT.venueBrand}</span>
            <span>{EVENT.room}</span>
          </dd>
        </div>
      </dl>

      {appointmentAttendees.length > 0 && (
        <div className={`${s.appointment} ${s.reveal}`}>
          <span className={s.appointmentBar} aria-hidden="true" />
          <strong>Demostración personalizada</strong>
          <ul>
            {appointmentAttendees.map((attendee) => (
              <li key={attendee.id}>
                {attendee.name}: {' '}
                {APPOINTMENT_SLOTS.find((slot) => slot.id === attendee.preferredTime)?.label ??
                  attendee.preferredTime}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`${s.actions} ${s.reveal}`}>
        <PrimaryButton
          onClick={() => {
            track('add_to_calendar', { method: 'google' });
            window.open(GOOGLE_CALENDAR_URL, '_blank', 'noopener,noreferrer');
          }}
        >
          Agregar al calendario
        </PrimaryButton>

        <a className={s.mapLink} href={MAPS_URL} target="_blank" rel="noopener noreferrer">
          Cómo llegar <span aria-hidden="true">↗</span>
        </a>
      </div>

      <p className={`${s.contact} ${s.reveal}`}>
        ¿Necesita algo antes del evento?{' '}
        <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer">
          WhatsApp {CONTACT.whatsapp}
        </a>{' '}
        ·{' '}
        <a href={CONTACT.phoneHref}>
          {CONTACT.phone} ext. {CONTACT.phoneExt}
        </a>
      </p>

      <div className={`${s.foot} ${s.reveal}`}>
        <button
          type="button"
          className={s.textLink}
          onClick={() => {
            track('add_to_calendar', { method: 'ics' });
            downloadIcs();
          }}
        >
          Descargar invitación (.ics)
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" className={s.textLink} onClick={onNew}>
          Registrar otra empresa
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" className={s.textLink} onClick={onClose}>
          Volver a la invitación
        </button>
      </div>
    </div>
  );
}
