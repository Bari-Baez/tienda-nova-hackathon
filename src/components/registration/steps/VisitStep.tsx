import type { CSSProperties } from 'react';
import { APPOINTMENT_SLOTS, VISIT_OPTIONS } from '../../../data/event';
import type { FieldErrors } from '../../../lib/validation';
import type { AttendeeData, VisitType } from '../../../types';
import StepHeader from './StepHeader';
import s from '../Registration.module.css';

interface Props {
  attendees: AttendeeData[];
  errors: FieldErrors;
  onChange: <K extends keyof Omit<AttendeeData, 'id'>>(
    id: string,
    field: K,
    value: AttendeeData[K],
  ) => void;
  onApplyVisit: (visitType: VisitType) => void;
}

function VisitOptions({
  attendee,
  error,
  timeError,
  onChange,
  onTimeChange,
}: {
  attendee: AttendeeData;
  error?: string;
  timeError?: string;
  onChange: (visitType: VisitType) => void;
  onTimeChange: (preferredTime: string) => void;
}) {
  return (
    <fieldset className={s.fieldset}>
      <legend className="srOnly">Preferencia para {attendee.name}</legend>
      <div className={s.optionsCompact}>
        {VISIT_OPTIONS.map((option) => {
          const selected = attendee.visitType === option.id;
          return (
            <label
              key={option.id}
              className={`${s.option} ${selected ? s.optionActive : ''}`}
              style={{ '--accent': option.accent } as CSSProperties}
            >
              <input
                className={s.srInput}
                type="radio"
                name={`visitType-${attendee.id}`}
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
              />
              <span className={s.optionMark} aria-hidden="true">
                {option.mark}
              </span>
              <span className={s.optionBody}>
                <span className={s.optionTitle}>{option.title}</span>
                <span className={s.optionSupport}>{option.support}</span>
              </span>
              <span className={s.optionCheck} aria-hidden="true" />
            </label>
          );
        })}
      </div>
      {attendee.visitType === 'contacto' && (
        <fieldset className={s.schedule}>
          <legend className={s.scheduleLegend}>Seleccione la hora de la cita</legend>
          <p className={s.scheduleSupport}>
            Cada bloque corresponde a una demostración personalizada de una hora.
          </p>
          <div className={s.timeGrid}>
            {APPOINTMENT_SLOTS.map((slot) => {
              const selected = attendee.preferredTime === slot.id;
              return (
                <label className={`${s.timeOption} ${selected ? s.timeOptionActive : ''}`} key={slot.id}>
                  <input
                    className={s.srInput}
                    type="radio"
                    name={`preferredTime-${attendee.id}`}
                    value={slot.id}
                    checked={selected}
                    onChange={() => onTimeChange(slot.id)}
                  />
                  <span>{slot.label}</span>
                </label>
              );
            })}
          </div>
          {timeError && (
            <p className={s.fieldsetError} role="alert">
              {timeError}
            </p>
          )}
        </fieldset>
      )}
      {error && (
        <p className={s.fieldsetError} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export default function VisitStep({
  attendees,
  errors,
  onChange,
  onApplyVisit,
}: Props) {
  return (
    <div className={s.step}>
      <StepHeader
        mark="Su visita"
        title="Seleccione cómo participará cada invitado"
        sub="Puede asistir libremente durante el evento o reservar una hora para una demostración personalizada."
      />

      {attendees.length > 1 && (
        <section className={s.applyAll} aria-labelledby="apply-all-title">
          <div>
            <h3 className={s.applyAllTitle} id="apply-all-title">
              Aplicar una opción a todos
            </h3>
            <p className={s.applyAllText}>Después puede ajustar cualquier invitado por separado.</p>
          </div>
          <div className={s.applyButtons}>
            <button type="button" onClick={() => onApplyVisit('confirmar')}>
              Confirmar asistencia
            </button>
            <button type="button" onClick={() => onApplyVisit('contacto')}>
              Agendar demostración
            </button>
          </div>
        </section>
      )}

      <div className={s.preferenceList}>
        {attendees.map((attendee, index) => {
          const attendeeErrors = errors.attendees?.[attendee.id];
          return (
            <section className={s.preferenceGroup} key={attendee.id}>
              <div className={s.preferenceHead}>
                <span className={s.preferenceIndex}>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{attendee.name}</h3>
                  <p>{attendee.jobTitle}</p>
                  <p>{attendee.email}</p>
                </div>
              </div>

              <VisitOptions
                attendee={attendee}
                error={attendeeErrors?.visitType}
                timeError={attendeeErrors?.preferredTime}
                onChange={(visitType) => onChange(attendee.id, 'visitType', visitType)}
                onTimeChange={(preferredTime) =>
                  onChange(attendee.id, 'preferredTime', preferredTime)
                }
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
