import PrimaryButton from '../../ui/PrimaryButton';
import s from '../Registration.module.css';

interface Props {
  onBegin: () => void;
  onClose: () => void;
}

export default function IntroStep({ onBegin, onClose }: Props) {
  return (
    <section className={s.intro} aria-labelledby="registration-intro-title">
      <p className={s.stepMark}>
        <span className={s.stepDot} aria-hidden="true" />
        Antes de comenzar
      </p>

      <div className={s.introLead}>
        <span className={s.introNumber} aria-hidden="true">
          ∞
        </span>
        <div>
          <h2 className={s.title} id="registration-intro-title">
            Confirme quiénes asistirán
          </h2>
          <p className={s.sub}>
            Agregue a cada persona que asistirá al evento en representación de su empresa. No hay
            un límite de invitados y cada uno recibirá su confirmación por correo.
          </p>
        </div>
      </div>

      <ol className={s.introList}>
        <li>Indique el nombre, cargo y teléfono directo de cada invitado.</li>
        <li>Asigne un correo de confirmación a cada persona.</li>
        <li>Indique si asistirá durante el día o reservará una demostración personalizada.</li>
      </ol>

      <div className={s.actionRow}>
        <PrimaryButton type="button" variant="ghost" onClick={onClose}>
          Volver
        </PrimaryButton>
        <PrimaryButton type="button" full onClick={onBegin}>
          Comenzar registro
        </PrimaryButton>
      </div>
    </section>
  );
}
