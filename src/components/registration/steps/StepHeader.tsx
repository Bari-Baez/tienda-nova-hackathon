import s from '../Registration.module.css';

interface Props {
  mark: string;
  title: string;
  sub?: string;
}

/** Una sola pregunta por pantalla, siempre en el mismo lugar. */
export default function StepHeader({ mark, title, sub }: Props) {
  return (
    <div className={s.head}>
      <p className={s.stepMark}>
        <span className={s.stepDot} aria-hidden="true" />
        {mark}
      </p>
      <h2 className={s.title}>{title}</h2>
      {sub && <p className={s.sub}>{sub}</p>}
    </div>
  );
}
