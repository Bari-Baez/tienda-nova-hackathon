import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import s from './Field.module.css';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  labelDetail?: string;
  hint?: string;
  error?: string;
  index?: string;
}

/**
 * Campo con etiqueta real, pista opcional y error asociado por aria-describedby.
 * Altura mínima 58 px y tipografía de 17 px: iOS no hace zoom al enfocar.
 */
export default function Field({
  label,
  labelDetail,
  hint,
  error,
  index,
  className = '',
  ...rest
}: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={`${s.field} ${error ? s.hasError : ''} ${className}`}>
      <label className={s.label} htmlFor={id}>
        {index && <span className={s.index}>{index}</span>}
        <span className={s.labelText}>
          <span>{label}</span>
          {labelDetail && <span className={s.labelDetail}>{labelDetail}</span>}
        </span>
      </label>

      <div className={s.shell}>
        <input
          id={id}
          className={s.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...rest}
        />
      </div>

      {hint && !error && (
        <p id={hintId} className={s.hint}>
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className={s.error} role="alert">
          <span className={s.errorMark} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
