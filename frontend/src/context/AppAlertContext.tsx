import { Alert } from "@/components/ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { Snackbar, type AlertColor, type SnackbarCloseReason } from "@mui/material";

const SNACKBAR_AUTO_HIDE_MS = 5000;

type AppAlertPayload = {
  severity: AlertColor;
  message: string;
  onClose?: () => void;
};

type AppAlertState = AppAlertPayload & { id: number };

type AppAlertContextValue = {
  alert: AppAlertState | null;
  showAlert: (payload: AppAlertPayload) => void;
  clearAlert: () => void;
};

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlertState] = useState<AppAlertState | null>(null);
  const idRef = useRef(0);

  const clearAlert = useCallback(() => {
    setAlertState(null);
  }, []);

  const showAlert = useCallback((payload: AppAlertPayload) => {
    idRef.current += 1;
    setAlertState({ ...payload, id: idRef.current });
  }, []);

  return (
    <AppAlertContext.Provider value={{ alert, showAlert, clearAlert }}>
      {children}
    </AppAlertContext.Provider>
  );
}

export function useAppAlert(): AppAlertContextValue {
  const ctx = useContext(AppAlertContext);
  if (!ctx) {
    return {
      alert: null,
      showAlert: () => {},
      clearAlert: () => {},
    };
  }
  return ctx;
}

/** Show panel snackbar alerts from pages. */
export function usePageAlert() {
  const { showAlert, clearAlert } = useAppAlert();

  const showError = useCallback(
    (message: string, onClose?: () => void) => {
      showAlert({ severity: "error", message, onClose });
    },
    [showAlert],
  );

  const showSuccess = useCallback(
    (message: string, onClose?: () => void) => {
      showAlert({ severity: "success", message, onClose });
    },
    [showAlert],
  );

  const showInfo = useCallback(
    (message: string, onClose?: () => void) => {
      showAlert({ severity: "info", message, onClose });
    },
    [showAlert],
  );

  return { showError, showSuccess, showInfo, clearAlert };
}

export function AppAlertBanner() {
  const { alert, clearAlert } = useAppAlert();
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!alert) return;
    if (alert.severity === "error") {
      setShake(true);
      const timer = window.setTimeout(() => setShake(false), 520);
      return () => window.clearTimeout(timer);
    }
  }, [alert?.id, alert?.severity]);

  const dismiss = () => {
    alert?.onClose?.();
    clearAlert();
  };

  const handleClose = (_event?: SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
    if (reason === "clickaway") return;
    dismiss();
  };

  return (
    <Snackbar
      open={Boolean(alert)}
      autoHideDuration={SNACKBAR_AUTO_HIDE_MS}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 200,
        bottom: { xs: 24, md: 32 },
        left: { xs: 16, sm: "50%" },
        right: { xs: 16, sm: "auto" },
        transform: { sm: "translateX(-50%)" },
        width: { xs: "calc(100% - 32px)", sm: "auto" },
        maxWidth: 560,
      }}
    >
      <Alert
        severity={alert?.severity ?? "info"}
        variant="filled"
        onClose={dismiss}
        className={shake ? "ui-alert-shake" : "ui-alert-enter"}
        sx={{ width: "100%", boxShadow: 6 }}
      >
        {alert?.message ?? ""}
      </Alert>
    </Snackbar>
  );
}
