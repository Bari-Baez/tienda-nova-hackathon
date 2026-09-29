import type { AttendeeData, RegistrationData } from '../types';

export type AttendeeErrors = Partial<
  Record<'name' | 'jobTitle' | 'phone' | 'email' | 'visitType' | 'preferredTime', string>
>;

export interface FieldErrors {
  companyName?: string;
  companyPhone?: string;
  attendees?: Record<string, AttendeeErrors>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const digits = (value: string) => value.replace(/\D/g, '');

export const isValidEmail = (value: string) => EMAIL_RE.test(value.trim());
export const isValidPhone = (value: string) => {
  const normalized = digits(value);
  return normalized.length >= 8 && normalized.length <= 15;
};

export const MESSAGES = {
  required: 'Este dato es necesario para continuar.',
  name: 'Escriba el nombre completo.',
  jobTitle: 'Indique el cargo que ocupa en la empresa.',
  email: 'Revise el correo electrónico ingresado.',
  phone: 'Revise el número de teléfono.',
  visit: 'Seleccione una opción para esta persona.',
  preferredTime: 'Seleccione la hora de la demostración personalizada.',
} as const;

function attendeeErrorMap(
  data: RegistrationData,
  validate: (attendee: AttendeeData) => AttendeeErrors,
) {
  const entries = data.attendees
    .map((attendee) => [attendee.id, validate(attendee)] as const)
    .filter(([, errors]) => Object.keys(errors).length > 0);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function validateCompanyStep(data: RegistrationData): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.companyName.trim()) errors.companyName = MESSAGES.required;
  if (!data.companyPhone.trim()) errors.companyPhone = MESSAGES.required;
  else if (!isValidPhone(data.companyPhone)) errors.companyPhone = MESSAGES.phone;
  return errors;
}

export function validateAttendeeStep(data: RegistrationData): FieldErrors {
  const attendees = attendeeErrorMap(data, (attendee) => {
    const errors: AttendeeErrors = {};
    const name = attendee.name.trim();
    if (!name) errors.name = MESSAGES.required;
    else if (name.length < 3) errors.name = MESSAGES.name;
    if (!attendee.jobTitle.trim()) errors.jobTitle = MESSAGES.jobTitle;
    if (!attendee.phone.trim()) errors.phone = MESSAGES.required;
    else if (!isValidPhone(attendee.phone)) errors.phone = MESSAGES.phone;
    return errors;
  });
  return attendees ? { attendees } : {};
}

export function validateContactStep(data: RegistrationData): FieldErrors {
  const attendees = attendeeErrorMap(data, (attendee) => {
    if (!attendee.email.trim()) return { email: MESSAGES.required };
    if (!isValidEmail(attendee.email)) return { email: MESSAGES.email };
    return {};
  });
  return attendees ? { attendees } : {};
}

export function validateVisitStep(data: RegistrationData): FieldErrors {
  const attendees = attendeeErrorMap(data, (attendee) => {
    const errors: AttendeeErrors = {};
    if (!attendee.visitType) errors.visitType = MESSAGES.visit;
    if (attendee.visitType === 'contacto' && !attendee.preferredTime) {
      errors.preferredTime = MESSAGES.preferredTime;
    }
    return errors;
  });
  return attendees ? { attendees } : {};
}

export const STEP_VALIDATORS = [
  validateCompanyStep,
  validateAttendeeStep,
  validateContactStep,
  validateVisitStep,
];
