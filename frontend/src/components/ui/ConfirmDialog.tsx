import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, type ModalProps } from "@/components/ui/Modal";

export type ConfirmDialogProps = Omit<ModalProps, "actions" | "children"> & {
  message: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  tone?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  message,
  confirmLabel = "تأیید",
  cancelLabel = "انصراف",
  tone = "primary",
  loading,
  onConfirm,
  onCancel,
  onClose,
  ...props
}: ConfirmDialogProps) {
  return (
    <Modal
      {...props}
      onClose={(event, reason) => {
        if (!loading) {
          onClose?.(event, reason);
          onCancel();
        }
      }}
      showCloseButton={!loading}
      actions={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            loading={loading}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message}
    </Modal>
  );
}
