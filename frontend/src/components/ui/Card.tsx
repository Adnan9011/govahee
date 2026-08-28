import {
  Card as MuiCard,
  type CardProps as MuiCardProps,
  type SxProps,
  type Theme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { designTokens } from "@/theme/tokens";

export type CardAppearance = "default" | "outlined" | "elevated" | "interactive";

export type CardProps = Omit<MuiCardProps, "sx"> & {
  appearance?: CardAppearance;
  padding?: "none" | "small" | "medium" | "large";
  sx?: SxProps<Theme>;
};

const paddingMap = {
  none: 0,
  small: designTokens.spacing["1.5"],
  medium: designTokens.spacing[2],
  large: designTokens.spacing[3],
} as const;

export function Card({
  appearance = "default",
  padding = "none",
  sx,
  tabIndex,
  ...props
}: CardProps) {
  const appearanceSx: SxProps<Theme> = {
    p: `${paddingMap[padding]}px`,
    ...(appearance === "outlined" ? { boxShadow: "none" } : {}),
    ...(appearance === "elevated" ? { boxShadow: designTokens.shadow.lg } : {}),
    ...(appearance === "interactive"
      ? {
          cursor: "pointer",
          "&:hover": {
            transform: "translateY(-2px)",
            borderColor: alpha(designTokens.color.brand.primary, 0.35),
            boxShadow: designTokens.shadow.lg,
          },
          "&:focus-visible": {
            outline: `2px solid ${designTokens.color.border.focus}`,
            outlineOffset: 2,
          },
        }
      : {}),
  };

  return (
    <MuiCard
      {...props}
      variant={appearance === "outlined" ? "outlined" : props.variant}
      tabIndex={appearance === "interactive" ? (tabIndex ?? 0) : tabIndex}
      sx={[appearanceSx, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
    />
  );
}
