import { TextField, type TextFieldProps } from '@mui/material';
import { forwardRef } from 'react';
import type { FieldError } from 'react-hook-form';

type Props = Omit<TextFieldProps, 'error'> & { fieldError?: FieldError };
/** TextField wired for react-hook-form: accessible error text. */
export const FormText = forwardRef<HTMLInputElement, Props>(function FormText({ fieldError, helperText, ...rest }, ref) {
  return (
    <TextField fullWidth size="small" inputRef={ref} error={Boolean(fieldError)} helperText={fieldError?.message ?? helperText} {...rest} />
  );
});
