import type { FieldErrors } from '../../../lib/validation';
import type { AttendeeData } from '../../../types';
import Field from '../../ui/Field';
import StepHeader from './StepHeader';
import s from '../Registration.module.css';

interface Props {
  attendees: AttendeeData[];
  errors: FieldErrors;
  onChange: (id: string, value: string) => void;
}

export default function ContactStep({ attendees, errors, onChange }: Props) {
  return (
    <div className={s.step}>
      <StepHeader
        mark="Contacto"
        title="¿A dónde enviamos cada confirmación?"
        sub="Cada invitado recibirá por correo la fecha, el salón y los horarios del evento."
      />

      <div className={s.attendeeList}>
        {attendees.map((attendee, index) => (
          <div className={s.contactRow} key={attendee.id}>
            <Field
              index={String(index + 1).padStart(2, '0')}
              label="Correo electrónico"
              labelDetail={`Confirmación para ${attendee.name} · ${attendee.jobTitle}`}
              name={`attendee-${attendee.id}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="nombre@empresa.com"
              value={attendee.email}
              error={errors.attendees?.[attendee.id]?.email}
              onChange={(event) => onChange(attendee.id, event.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
