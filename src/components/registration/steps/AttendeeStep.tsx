import type { FieldErrors } from '../../../lib/validation';
import type { AttendeeData } from '../../../types';
import Field from '../../ui/Field';
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
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export default function AttendeeStep({
  attendees,
  errors,
  onChange,
  onAdd,
  onRemove,
}: Props) {
  return (
    <div className={s.step}>
      <StepHeader
        mark="Invitados"
        title="¿Quiénes nos acompañarán?"
        sub="Registre a todas las personas que asistirán. Puede agregar tantos invitados como necesite."
      />

      <div className={s.attendeeList} aria-live="polite">
        {attendees.map((attendee, index) => {
          const attendeeErrors = errors.attendees?.[attendee.id];
          return (
            <fieldset className={s.attendeeGroup} key={attendee.id}>
              <legend className={s.attendeeLegend}>
                <span>Invitado {index + 1}</span>
                {attendees.length > 1 && (
                  <button
                    type="button"
                    className={s.removeButton}
                    onClick={() => onRemove(attendee.id)}
                    aria-label={`Eliminar invitado ${index + 1}${attendee.name ? `, ${attendee.name}` : ''}`}
                  >
                    Eliminar
                  </button>
                )}
              </legend>

              <div className={s.attendeeFields}>
                <Field
                  label="Nombre completo"
                  name={`attendee-${attendee.id}-name`}
                  type="text"
                  autoComplete="name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  placeholder="Nombre y apellido"
                  value={attendee.name}
                  error={attendeeErrors?.name}
                  onChange={(event) => onChange(attendee.id, 'name', event.target.value)}
                />

                <Field
                  label="Cargo en la empresa"
                  name={`attendee-${attendee.id}-job-title`}
                  type="text"
                  autoComplete="organization-title"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  placeholder="Ej. Gerente de Operaciones"
                  value={attendee.jobTitle}
                  error={attendeeErrors?.jobTitle}
                  onChange={(event) => onChange(attendee.id, 'jobTitle', event.target.value)}
                />

                <Field
                  className={s.fullField}
                  label="Teléfono directo"
                  name={`attendee-${attendee.id}-phone`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="next"
                  placeholder="Ej. +1 809 000 0000"
                  value={attendee.phone}
                  error={attendeeErrors?.phone}
                  onChange={(event) => onChange(attendee.id, 'phone', event.target.value)}
                />
              </div>
            </fieldset>
          );
        })}
      </div>

      <button type="button" className={s.addButton} onClick={onAdd}>
        <span className={s.addIcon} aria-hidden="true">
          +
        </span>
        Agregar otro invitado
      </button>
    </div>
  );
}
