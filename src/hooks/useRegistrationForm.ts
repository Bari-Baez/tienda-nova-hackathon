import { useCallback, useEffect, useRef, useState } from 'react';
import { VISIT_OPTIONS } from '../data/event';
import { track } from '../lib/analytics';
import { clearRegistration, readRegistration, saveRegistration } from '../lib/storage';
import { STEP_VALIDATORS } from '../lib/validation';
import type { FieldErrors } from '../lib/validation';
import { GENERIC_ERROR, readSource, submitRegistration } from '../services/registration';
import type {
  AttendeeData,
  RegistrationData,
  SubmissionStatus,
  VisitType,
} from '../types';

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createAttendee(): AttendeeData {
  return {
    id: createId(),
    name: '',
    jobTitle: '',
    phone: '',
    email: '',
    visitType: '',
    preferredTime: '',
  };
}

function createEmpty(): RegistrationData {
  return { companyName: '', companyPhone: '', attendees: [createAttendee()] };
}

export const STEPS = [
  { id: 'empresa', label: 'Empresa' },
  { id: 'invitados', label: 'Invitados' },
  { id: 'contacto', label: 'Contacto' },
  { id: 'visita', label: 'Su visita' },
] as const;

export const TOTAL_STEPS = STEPS.length;

export interface RegistrationForm {
  data: RegistrationData;
  errors: FieldErrors;
  step: number;
  intro: boolean;
  status: SubmissionStatus;
  errorMessage: string;
  restoredCompany: string | null;
  honeypot: string;
  setHoneypot: (value: string) => void;
  begin: () => void;
  updateCompany: (field: 'companyName' | 'companyPhone', value: string) => void;
  updateAttendee: <K extends keyof Omit<AttendeeData, 'id'>>(
    id: string,
    field: K,
    value: AttendeeData[K],
  ) => void;
  addAttendee: () => void;
  removeAttendee: (id: string) => void;
  applyVisitToAll: (visitType: VisitType) => void;
  advance: () => boolean;
  goTo: (step: number) => void;
  back: () => void;
  reset: () => void;
  isLastStep: boolean;
}

export function useRegistrationForm(onRegistered: () => void): RegistrationForm {
  const [data, setData] = useState<RegistrationData>(createEmpty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [step, setStep] = useState(0);
  const [intro, setIntro] = useState(true);
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [restoredCompany, setRestoredCompany] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const startedAt = useRef(Date.now());
  const submissionId = useRef(createId());

  useEffect(() => {
    const stored = readRegistration();
    if (stored) {
      setRestoredCompany(stored.company);
      setStatus('success');
      setIntro(false);
    }
  }, []);

  const clearSubmitError = useCallback(() => {
    setStatus((current) => (current === 'error' ? 'idle' : current));
    setErrorMessage('');
  }, []);

  const begin = useCallback(() => {
    setIntro(false);
    startedAt.current = Date.now();
  }, []);

  const updateCompany = useCallback(
    (field: 'companyName' | 'companyPhone', value: string) => {
      setData((current) => ({ ...current, [field]: value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
      clearSubmitError();
    },
    [clearSubmitError],
  );

  const updateAttendee = useCallback(
    <K extends keyof Omit<AttendeeData, 'id'>>(
      id: string,
      field: K,
      value: AttendeeData[K],
    ) => {
      setData((current) => ({
        ...current,
        attendees: current.attendees.map((attendee) => {
          if (attendee.id !== id) return attendee;
          if (field === 'visitType') {
            const visitType = value as AttendeeData['visitType'];
            return {
              ...attendee,
              visitType,
              preferredTime: visitType === 'confirmar' ? '' : attendee.preferredTime,
            };
          }
          return { ...attendee, [field]: value };
        }),
      }));
      setErrors((current) => {
        if (!current.attendees?.[id]) return current;
        const attendeeErrors = { ...current.attendees[id], [field]: undefined };
        if (field === 'visitType' && value === 'confirmar') {
          attendeeErrors.preferredTime = undefined;
        }
        return { ...current, attendees: { ...current.attendees, [id]: attendeeErrors } };
      });
      clearSubmitError();
    },
    [clearSubmitError],
  );

  const addAttendee = useCallback(() => {
    setData((current) => ({ ...current, attendees: [...current.attendees, createAttendee()] }));
    clearSubmitError();
  }, [clearSubmitError]);

  const removeAttendee = useCallback(
    (id: string) => {
      setData((current) => ({
        ...current,
        attendees:
          current.attendees.length === 1
            ? current.attendees
            : current.attendees.filter((attendee) => attendee.id !== id),
      }));
      setErrors((current) => {
        if (!current.attendees) return current;
        const next = { ...current.attendees };
        delete next[id];
        return { ...current, attendees: next };
      });
      clearSubmitError();
    },
    [clearSubmitError],
  );

  const applyVisitToAll = useCallback(
    (visitType: VisitType) => {
      setData((current) => ({
        ...current,
        attendees: current.attendees.map((attendee) => ({
          ...attendee,
          visitType,
          preferredTime: visitType === 'confirmar' ? '' : attendee.preferredTime,
        })),
      }));
      setErrors((current) => ({ ...current, attendees: undefined }));
      clearSubmitError();
    },
    [clearSubmitError],
  );

  const submit = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');
    const source = readSource();

    const result = await submitRegistration({
      schemaVersion: 4,
      submissionId: submissionId.current,
      companyName: data.companyName.trim(),
      companyPhone: data.companyPhone.trim(),
      attendees: data.attendees.map((attendee) => {
        const visitOption = VISIT_OPTIONS.find((option) => option.id === attendee.visitType);
        return {
          name: attendee.name.trim(),
          jobTitle: attendee.jobTitle.trim(),
          phone: attendee.phone.trim(),
          email: attendee.email.trim().toLowerCase(),
          visitType: attendee.visitType as VisitType,
          visitTypeLabel: visitOption?.title ?? '',
          preferredTime: attendee.visitType === 'contacto' ? attendee.preferredTime : '',
        };
      }),
      source,
      submittedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt.current,
      website: honeypot,
    });

    if (result.ok) {
      saveRegistration({
        schemaVersion: 4,
        at: new Date().toISOString(),
        company: data.companyName.trim(),
        attendeeCount: data.attendees.length,
      });
      track('registration_success', { attendee_count: data.attendees.length, source });
      onRegistered();
      setStatus('success');
    } else {
      track('registration_error', { detail: result.detail });
      setErrorMessage(result.message ?? GENERIC_ERROR);
      setStatus('error');
    }
  }, [data, honeypot, onRegistered]);

  const advance = useCallback((): boolean => {
    if (status === 'loading') return false;
    const stepErrors = STEP_VALIDATORS[step](data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }
    track('step_completed', { step: STEPS[step].id });
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      setErrors({});
      clearSubmitError();
      return true;
    }
    void submit();
    return false;
  }, [clearSubmitError, data, status, step, submit]);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next > step || status === 'loading') return;
      setStep(next);
      setErrors({});
      clearSubmitError();
    },
    [clearSubmitError, status, step],
  );

  const back = useCallback(() => {
    if (step === 0) setIntro(true);
    else setStep((current) => current - 1);
    setErrors({});
    clearSubmitError();
  }, [clearSubmitError, step]);

  const reset = useCallback(() => {
    setData(createEmpty());
    setErrors({});
    setStep(0);
    setIntro(true);
    setStatus('idle');
    setErrorMessage('');
    setRestoredCompany(null);
    setHoneypot('');
    clearRegistration();
    startedAt.current = Date.now();
    submissionId.current = createId();
  }, []);

  return {
    data,
    errors,
    step,
    intro,
    status,
    errorMessage,
    restoredCompany,
    honeypot,
    setHoneypot,
    begin,
    updateCompany,
    updateAttendee,
    addAttendee,
    removeAttendee,
    applyVisitToAll,
    advance,
    goTo,
    back,
    reset,
    isLastStep: step === TOTAL_STEPS - 1,
  };
}
