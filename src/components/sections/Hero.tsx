import { EVENT } from '../../data/event';
import s from './Hero.module.css';

interface Props {
  registered: boolean;
  onStart: () => void;
}

/**
 * Cuerpo de la invitación: lo justo para saber qué es, cuándo, dónde y qué
 * hacer. El botón lleva data-flip-id porque es el que se convierte en el
 * pliego del formulario.
 */
export default function Hero({ registered, onStart }: Props) {
  return (
    <div className={s.hero}>
      <dl className={s.meta} data-stage-in>
        <div className={s.metaRow}>
          <dt className={`micro ${s.metaLabel}`}>
            <span className="tnum" aria-hidden="true">01</span>
            Cuándo
          </dt>
          <dd className={s.dateBody}>
            <div className={s.dateStamp} aria-hidden="true">
              <strong className="tnum">{EVENT.day}</strong>
              <span>SEP</span>
            </div>
            <div className={s.metaDetails}>
              <strong className="tnum">{EVENT.dateLong}</strong>
              <span className={`tnum ${s.schedule}`}>
                <b>{EVENT.exhibitionLabel}</b> {EVENT.exhibitionHours}
                <i aria-hidden="true" />
                <b>{EVENT.cocktailLabel}</b> {EVENT.cocktailHours}
              </span>
            </div>
          </dd>
        </div>
        <div className={s.metaRow}>
          <dt className={`micro ${s.metaLabel}`}>
            <span className="tnum" aria-hidden="true">02</span>
            Dónde
          </dt>
          <dd className={s.metaDetails}>
            <strong>
              {EVENT.venue}, {EVENT.venueBrand}
            </strong>
            <span>
              {EVENT.room} · {EVENT.city}
            </span>
          </dd>
        </div>
      </dl>

      <div className={s.actions} data-stage-in>
        <button type="button" className={s.cta} onClick={onStart} data-flip-id="pg-sheet" data-cta="hero">
          <span data-flip-content>
            {registered ? 'Ver mi confirmación' : 'Confirmar asistencia'}
          </span>
        </button>
        <p className={s.note}>
          {registered ? 'Ya tenemos su registro' : 'Toma menos de un minuto'}
        </p>
      </div>

      <a className={s.discover} href="#equipos" data-stage-in>
        <span className={s.discoverCopy}>
          <strong>Ver los equipos</strong>
          <small>Conozca qué encontrará en exhibición y demostración</small>
        </span>
        <span className={s.discoverArrow} aria-hidden="true">↓</span>
      </a>
    </div>
  );
}
