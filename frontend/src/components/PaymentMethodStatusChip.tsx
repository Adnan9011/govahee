import { Chip } from "@mui/material";
import { fa } from "@/i18n/fa";

export function PaymentMethodStatusChip({ enabled }: { enabled: boolean }) {
  return (
    <Chip
      size="small"
      label={fa.paymentMethodDisabled}
      sx={{
        visibility: enabled ? "hidden" : "visible",
        bgcolor: "error.main",
        color: "error.contrastText",
        fontWeight: 600,
        minWidth: 56,
      }}
    />
  );
}
