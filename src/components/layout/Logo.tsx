import logotipo from '../../assets/logo-plaza-grafica.svg';
import s from './Logo.module.css';

interface Props {
  compact?: boolean;
}

/** Logotipo oficial de Plaza Gráfica Dominicana (SVG, sin fondo). */
export default function Logo({ compact = false }: Props) {
  return (
    <div className={`${s.root} ${compact ? s.compact : ''}`}>
      <img
        className={s.image}
        src={logotipo}
        alt="Plaza Gráfica Dominicana"
        width={432}
        height={45}
      />
      <span className={s.sub}>Dominicana</span>
    </div>
  );
}
