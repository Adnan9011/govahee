import { useEffect, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export type ConfirmActionOptions = {
  title?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  tone?: "primary" | "danger";
};

type ConfirmRequest = ConfirmActionOptions & {
  id: number;
  message: ReactNode;
  resolve: (confirmed: boolean) => void;
};

type ConfirmListener = (request: ConfirmRequest) => void;

const listeners = new Set<ConfirmListener>();
let requestId = 0;

export function confirmAction(
  message: ReactNode,
  options: ConfirmActionOptions = {},
): Promise<boolean> {
  if (listeners.size === 0) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const request: ConfirmRequest = {
      ...options,
      id: ++requestId,
      message,
      resolve,
    };
    listeners.forEach((listener) => listener(request));
  });
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    const listener: ConfirmListener = (nextRequest) => {
      setRequest((currentRequest) => {
        currentRequest?.resolve(false);
        return nextRequest;
      });
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const settle = (confirmed: boolean) => {
    setRequest((currentRequest) => {
      currentRequest?.resolve(confirmed);
      return null;
    });
  };

  return (
    <>
      {children}
      <ConfirmDialog
        open={Boolean(request)}
        title={request?.title ?? "تأیید عملیات"}
        message={request?.message}
        confirmLabel={request?.confirmLabel}
        cancelLabel={request?.cancelLabel}
        tone={request?.tone ?? "danger"}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </>
  );
}
