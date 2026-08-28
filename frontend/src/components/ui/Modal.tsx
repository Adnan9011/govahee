import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@/components/ui/primitives";
import { Box, IconButton, Stack, type DialogProps } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useId, type ReactNode } from "react";

export type ModalProps = Omit<DialogProps, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  showCloseButton?: boolean;
  closeLabel?: string;
};

export function Modal({
  title,
  description,
  actions,
  children,
  showCloseButton = true,
  closeLabel = "بستن",
  onClose,
  fullWidth = true,
  maxWidth = "sm",
  ...props
}: ModalProps) {
  const generatedId = useId();
  const titleId =
    props["aria-labelledby"] ?? `design-system-dialog-${generatedId.replace(/:/g, "")}`;

  return (
    <Dialog
      {...props}
      onClose={onClose}
      fullWidth={fullWidth}
      maxWidth={maxWidth}
      aria-labelledby={titleId}
    >
      <DialogTitle id={titleId}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Box component="span">{title}</Box>
          {showCloseButton ? (
            <IconButton
              size="small"
              aria-label={closeLabel}
              onClick={(event) => onClose?.(event, "escapeKeyDown")}
              sx={{ mt: -0.5, ml: -0.5, flexShrink: 0 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
      </DialogTitle>
      <DialogContent>
        {description ? (
          <DialogContentText sx={{ mb: children ? 2 : 0 }}>{description}</DialogContentText>
        ) : null}
        {children}
      </DialogContent>
      {actions ? <DialogActions>{actions}</DialogActions> : null}
    </Dialog>
  );
}
