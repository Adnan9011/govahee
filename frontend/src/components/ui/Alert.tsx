import {
  Alert as MuiAlert,
  AlertTitle,
  type AlertProps as MuiAlertProps,
} from "@mui/material";
import { forwardRef, type ReactNode } from "react";

export type AlertProps = MuiAlertProps & {
  title?: ReactNode;
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { title, children, variant = "standard", ...props },
  ref,
) {
  if (!children && !title) return null;
  return (
    <MuiAlert {...props} ref={ref} variant={variant}>
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {children}
    </MuiAlert>
  );
});
