import { Alert } from "@/components/ui";
import {
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { AlertProps, Box, useTheme } from "@mui/material";
import { useAppAlert } from "@/context/AppAlertContext";
import { getAppHeaderOffset } from "@/utils/scroll";

type AnimatedAlertProps = AlertProps & {
  /** When false, alert is hidden */
  open?: boolean;
  /** Keep in normal document flow (forms, dialogs). Default: bottom snackbar in panels. */
  inline?: boolean;
};

function alertMessage(children: ReactNode): string {
  if (children == null || children === false) return "";
  return typeof children === "string" || typeof children === "number"
    ? String(children)
    : String(children);
}

export function AnimatedAlert({
  open = true,
  severity = "info",
  children,
  onClose,
  sx,
  inline = false,
  ...props
}: AnimatedAlertProps) {
  const theme = useTheme();
  const { showAlert, clearAlert } = useAppAlert();
  const anchorRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const headerOffset = getAppHeaderOffset(theme);
  const message = alertMessage(children);
  const isOpen = open && Boolean(message);

  useLayoutEffect(() => {
    if (inline) return;
    if (!isOpen) {
      clearAlert();
      return;
    }
    showAlert({
      severity: severity ?? "info",
      message,
      onClose: onCloseRef.current
        ? () => onCloseRef.current?.({} as React.SyntheticEvent)
        : undefined,
    });
    return () => clearAlert();
  }, [inline, isOpen, message, severity, showAlert, clearAlert]);

  if (!inline) return null;
  if (!isOpen) return null;

  return (
    <Box ref={anchorRef} sx={{ scrollMarginTop: `${headerOffset}px` }}>
      <Alert
        severity={severity}
        onClose={onClose}
        sx={{ mb: 2, ...sx }}
        {...props}
      >
        {children}
      </Alert>
    </Box>
  );
}
