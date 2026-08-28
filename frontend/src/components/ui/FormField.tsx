import {
  FormControl,
  FormHelperText,
  FormLabel,
  Typography,
  type FormControlProps,
} from "@mui/material";
import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

export type FormFieldProps = Omit<FormControlProps, "error" | "children"> & {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  inputId?: string;
};

export function Label({
  children,
  htmlFor,
  required,
}: {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <FormLabel htmlFor={htmlFor} required={required} sx={{ mb: 0.75 }}>
      {children}
    </FormLabel>
  );
}

export function HelperText({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <FormHelperText id={id} component="div">
      {children}
    </FormHelperText>
  );
}

export function ErrorMessage({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  if (!children) return null;
  return (
    <Typography id={id} variant="caption" color="error.main" role="alert" sx={{ mt: 0.5 }}>
      {children}
    </Typography>
  );
}

export function FormField({
  label,
  helperText,
  error,
  required,
  children,
  inputId,
  fullWidth = true,
  ...props
}: FormFieldProps) {
  const generatedId = useId();
  const id = inputId ?? `field-${generatedId.replace(/:/g, "")}`;
  const messageId = error || helperText ? `${id}-message` : undefined;
  const child =
    isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          id: children.props.id ?? id,
          "aria-describedby": children.props["aria-describedby"] ?? messageId,
          "aria-invalid": children.props["aria-invalid"] ?? (Boolean(error) || undefined),
          required: children.props.required ?? required,
        })
      : children;

  return (
    <FormControl
      {...props}
      fullWidth={fullWidth}
      required={required}
      error={Boolean(error)}
    >
      {label ? (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      ) : null}
      {child}
      {error ? (
        <ErrorMessage id={messageId}>{error}</ErrorMessage>
      ) : helperText ? (
        <HelperText id={messageId}>{helperText}</HelperText>
      ) : null}
    </FormControl>
  );
}
