import { useEffect, useLayoutEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { gsap } from '../../lib/gsapSetup';
import { PRIVACY_NOTE } from '../../data/event';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { STEPS } from '../../hooks/useRegistrationForm';
import type { RegistrationForm } from '../../hooks/useRegistrationForm';
import CompanyStep from './steps/CompanyStep';
import AttendeeStep from './steps/AttendeeStep';
import ContactStep from './steps/ContactStep';
import IntroStep from './steps/IntroStep';
import VisitStep from './steps/VisitStep';
import PrimaryButton from '../ui/PrimaryButton';
import StepNodes from './StepNodes';
import SuccessScreen from './SuccessScreen';
import s from './Registration.module.css';

const LABELS = STEPS.map((step) => step.label);

interface Props {
  form: RegistrationForm;
  onClose: () => void;
}

export default function RegistrationExperience({ form, onClose }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { data, errors, step, intro, status, errorMessage, isLastStep } = form;
  const viewIndex = intro ? -1 : step;

  const previous = useRef(viewIndex);
  useLayoutEffect(() => {
    const el = stage.current;
    const direction = viewIndex >= previous.current ? 1 : -1;
    previous.current = viewIndex;
    if (!el || reduced || status === 'success') return;

    const tween = gsap.fromTo(
      el,
      { opacity: 0, x: 24 * direction },
      { opacity: 1, x: 0, duration: 0.32, ease: 'power3.out' },
    );
    return () => {
      tween.kill();
      gsap.set(el, { opacity: 1, x: 0 });
    };
  }, [reduced, status, viewIndex]);

  useEffect(() => {
    if (status === 'success') return;
    const timer = window.setTimeout(() => stage.current?.focus({ preventScroll: true }), 340);
    return () => window.clearTimeout(timer);
  }, [intro, status, step]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const advanced = form.advance();
    if (!advanced) {
      window.requestAnimationFrame(() => {
        stage.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
    }
  };

  const loading = status === 'loading';
  const submitLabel = loading
    ? 'Confirmando el registro…'
    : isLastStep
      ? status === 'error'
        ? 'Intentar nuevamente'
        : `Confirmar ${data.attendees.length > 1 ? `${data.attendees.length} asistencias` : 'asistencia'}`
      : 'Continuar';

  return (
    <div className={s.sheet} data-flip-id="pg-sheet">
      <div className={s.inner} data-flip-content>
        {status === 'success' ? (
          <SuccessScreen
            data={data}
            restoredCompany={form.restoredCompany}
            onClose={onClose}
            onNew={form.reset}
          />
        ) : intro ? (
          <div className={s.stage} ref={stage} tabIndex={-1}>
            <IntroStep onBegin={form.begin} onClose={onClose} />
          </div>
        ) : (
          <>
            <StepNodes labels={LABELS} current={step} onGo={form.goTo} />

            <form className={s.form} onSubmit={handleSubmit} noValidate>
              <div className={s.stage} ref={stage} tabIndex={-1}>
                {step === 0 && (
                  <CompanyStep data={data} errors={errors} onChange={form.updateCompany} />
                )}
                {step === 1 && (
                  <AttendeeStep
                    attendees={data.attendees}
                    errors={errors}
                    onChange={form.updateAttendee}
                    onAdd={form.addAttendee}
                    onRemove={form.removeAttendee}
                  />
                )}
                {step === 2 && (
                  <ContactStep
                    attendees={data.attendees}
                    errors={errors}
                    onChange={(id, value) => form.updateAttendee(id, 'email', value)}
                  />
                )}
                {step === 3 && (
                  <VisitStep
                    attendees={data.attendees}
                    errors={errors}
                    onChange={form.updateAttendee}
                    onApplyVisit={form.applyVisitToAll}
                  />
                )}
              </div>

              <div className={s.honeypot} aria-hidden="true">
                <label htmlFor="website-hp">No complete este campo</label>
                <input
                  id="website-hp"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.honeypot}
                  onChange={(event) => form.setHoneypot(event.target.value)}
                />
              </div>

              <footer className={s.actions}>
                {status === 'error' && (
                  <p className={s.submitError} role="alert">
                    {errorMessage}
                  </p>
                )}

                {isLastStep && <p className={s.privacy}>{PRIVACY_NOTE}</p>}

                <div className={s.actionRow}>
                  <PrimaryButton type="button" variant="ghost" onClick={form.back} disabled={loading}>
                    <span aria-hidden="true">←</span> Atrás
                  </PrimaryButton>

                  <PrimaryButton type="submit" full disabled={loading}>
                    {loading && <span className={s.spinner} aria-hidden="true" />}
                    {submitLabel}
                  </PrimaryButton>
                </div>
              </footer>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
