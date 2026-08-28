import {
  Typography,
  type TypographyProps,
} from "@mui/material";
import { typographyRoles } from "@/theme/typography";

export type TextRole = keyof typeof typographyRoles;

export type TextProps = Omit<TypographyProps, "variant" | "color"> & {
  role?: TextRole;
};

export function Text({
  role = "body",
  ...props
}: TextProps) {
  const style = typographyRoles[role];
  return <Typography {...props} variant={style.variant} color={style.color} />;
}
