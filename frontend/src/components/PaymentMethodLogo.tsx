import { Box, type SxProps, type Theme } from "@mui/material";
import type { SystemStyleObject } from "@mui/system";
import { designTokens } from "@/theme/tokens";

type PaymentMethodLogoProps = {
  method: "bitpay" | "zarinpal" | "zibal" | "card";
  sx?: SxProps<Theme>;
};

const LOGO_STYLES: Record<
  PaymentMethodLogoProps["method"],
  SystemStyleObject<Theme>
> = {
  bitpay: {
    bgcolor: designTokens.color.payment.bitpay,
    color: designTokens.color.common.white,
    fontWeight: 800,
    letterSpacing: 0.5,
  },
  zarinpal: {
    bgcolor: designTokens.color.common.white,
    color: designTokens.color.payment.zarinpal,
    border: "1px solid",
    borderColor: "divider",
    fontWeight: 800,
  },
  zibal: {
    bgcolor: designTokens.color.payment.zibal,
    color: designTokens.color.common.white,
    fontWeight: 800,
  },
  card: {
    bgcolor: "grey.900",
    color: designTokens.color.common.white,
    fontWeight: 700,
  },
};

const LOGO_LABELS: Record<PaymentMethodLogoProps["method"], string> = {
  bitpay: "BitPay",
  zarinpal: "ZP",
  zibal: "Zibal",
  card: "💳",
};

export function PaymentMethodLogo({ method, sx }: PaymentMethodLogoProps) {
  return (
    <Box
      sx={[
        {
          width: 72,
          height: 48,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: method === "card" ? 24 : 15,
        },
        LOGO_STYLES[method],
        ...(Array.isArray(sx) ? sx : [sx]),
      ] as SxProps<Theme>}
      aria-hidden
    >
      {LOGO_LABELS[method]}
    </Box>
  );
}
