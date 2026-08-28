import { Stack, Typography, type TypographyProps } from "@mui/material";
import { formatMoney } from "@/utils/format";

type PriceAmountProps = {
  amount: string | number;
  variant?: TypographyProps["variant"];
  color?: TypographyProps["color"];
  fontWeight?: TypographyProps["fontWeight"];
  unitVariant?: TypographyProps["variant"];
  spacing?: number;
};

export function PriceAmount({
  amount,
  variant = "h4",
  color,
  fontWeight = 700,
  unitVariant = "body2",
  spacing = 1,
}: PriceAmountProps) {
  const formatted = typeof amount === "number" ? formatMoney(String(amount)) : formatMoney(amount);

  return (
    <Stack direction="row" spacing={spacing} alignItems="baseline" component="span">
      <Typography component="span" variant={variant} fontWeight={fontWeight} color={color}>
        {formatted}
      </Typography>
      <Typography component="span" variant={unitVariant} color="text.secondary">
        تومان
      </Typography>
    </Stack>
  );
}
