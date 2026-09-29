import s from './StepNodes.module.css';

interface Props {
  labels: readonly string[];
  current: number;
  onGo: (index: number) => void;
}

/**
 * La ruta del registro: nodos unidos por una línea fina. Los pasos ya
 * recorridos se pueden pulsar para volver; los siguientes, no.
 */
export default function StepNodes({ labels, current, onGo }: Props) {
  return (
    <nav className={s.root} aria-label="Progreso del registro">
      <span className="srOnly" aria-live="polite">
        Paso {current + 1} de {labels.length}: {labels[current]}
      </span>

      <ol className={s.list}>
        {labels.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={label}
              className={`${s.item} ${done ? s.done : ''} ${active ? s.active : ''}`}
            >
              <button
                type="button"
                className={s.node}
                onClick={() => onGo(i)}
                disabled={i >= current}
                aria-current={active ? 'step' : undefined}
                aria-label={`Paso ${i + 1}: ${label}`}
              >
                <span className={s.dot} aria-hidden="true" />
                <span className={s.label} aria-hidden="true">
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
