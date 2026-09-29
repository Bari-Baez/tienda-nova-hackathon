export type VisitType = 'confirmar' | 'contacto';

export interface AttendeeData {
  /** Identificador local estable para asociar errores y controles. */
  id: string;
  name: string;
  jobTitle: string;
  phone: string;
  email: string;
  visitType: VisitType | '';
  preferredTime: string;
}

/** Lo que el usuario escribe y elige en React. */
export interface RegistrationData {
  companyName: string;
  companyPhone: string;
  attendees: AttendeeData[];
}

export interface RegistrationAttendeePayload {
  name: string;
  jobTitle: string;
  phone: string;
  email: string;
  visitType: VisitType;
  visitTypeLabel: string;
  preferredTime: string;
}

/** Contrato versionado que recibe Apps Script. */
export interface RegistrationPayload {
  schemaVersion: 4;
  submissionId: string;
  companyName: string;
  companyPhone: string;
  attendees: RegistrationAttendeePayload[];
  source: string;
  submittedAt: string;
  elapsedMs: number;
  website: string;
}

export type SubmissionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SubmitResult {
  ok: boolean;
  message?: string;
  detail?: string;
  saved?: number;
}

export interface Equipment {
  id: string;
  brand: string;
  model: string;
  category: string;
  description: string;
  productUrl: string;
  accent: string;
}

export interface VisitOption {
  id: VisitType;
  mark: string;
  accent: string;
  title: string;
  support: string;
}

export interface AppointmentSlot {
  id: string;
  label: string;
}
