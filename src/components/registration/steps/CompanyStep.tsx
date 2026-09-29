import type { FieldErrors } from '../../../lib/validation';
import type { RegistrationData } from '../../../types';
import Field from '../../ui/Field';
import StepHeader from './StepHeader';
import s from '../Registration.module.css';

interface Props {
  data: RegistrationData;
  errors: FieldErrors;
  onChange: (field: 'companyName' | 'companyPhone', value: string) => void;
}

export default function CompanyStep({ data, errors, onChange }: Props) {
  return (
    <div className={s.step}>
      <StepHeader mark="Empresa" title="Cuéntenos sobre su empresa" />

      <div className={s.fields}>
        <Field
          index="01"
          label="Nombre de la empresa"
          name="companyName"
          type="text"
          autoComplete="organization"
          autoCapitalize="words"
          enterKeyHint="next"
          placeholder="Ej. Empresa Dominicana, S.A."
          value={data.companyName}
          error={errors.companyName}
          onChange={(event) => onChange('companyName', event.target.value)}
        />

        <Field
          index="02"
          label="Teléfono de contacto de la empresa"
          name="companyPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          enterKeyHint="next"
          placeholder="Ej. +1 809 000 0000"
          hint="Puede utilizar el mismo número de uno de los invitados si corresponde."
          value={data.companyPhone}
          error={errors.companyPhone}
          onChange={(event) => onChange('companyPhone', event.target.value)}
        />
      </div>
    </div>
  );
}
