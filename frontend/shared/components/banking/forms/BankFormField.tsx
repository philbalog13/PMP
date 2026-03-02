'use client';

import { forwardRef } from 'react';
import { BankInput }  from '../primitives/BankInput';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
interface BankFormFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?:        string;
  error?:        string;
  hint?:         string;
  prefix?:       React.ReactNode;
  suffix?:       React.ReactNode;
  /** Wrapping className sur le container */
  fieldClass?:   string;
  /** Style sur le container */
  fieldStyle?:   React.CSSProperties;
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   BankFormField est un wrapper mince autour de BankInput
   qui ajoute un pattern standard label/input/error/hint
   et permet d'être utilisé directement avec react-hook-form.
   ══════════════════════════════════════════════════════ */
export const BankFormField = forwardRef<HTMLInputElement, BankFormFieldProps>(
function BankFormField(
  { label, error, hint, prefix, suffix, fieldClass, fieldStyle, ...inputProps },
  ref,
) {
  return (
    <BankInput
      ref={ref}
      label={label}
      error={error}
      hint={hint}
      prefix={prefix}
      suffix={suffix}
      className={fieldClass}
      style={fieldStyle}
      {...inputProps}
    />
  );
});
