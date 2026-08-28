import {
  Button as MuiButton,
  CircularProgress,
  type ButtonProps as MuiButtonProps,
  type SxProps,
  type Theme,
} from "@mui/material";
import {
  forwardRef,
  type HTMLAttributeAnchorTarget,
  type ReactNode,
} from "react";
import { designTokens } from "@/theme/tokens";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "link";

export type ButtonSize = "small" | "medium" | "large";

type LegacyButtonVariant = NonNullable<MuiButtonProps["variant"]>;

export type ButtonProps = Omit<MuiButtonProps, "variant" | "size"> & {
  variant?: ButtonVariant | LegacyButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: ReactNode;
  iconOnly?: boolean;
  /** Router/anchor props used by MUI's polymorphic `component` API. */
  to?: string;
  target?: HTMLAttributeAnchorTarget;
  rel?: string;
  download?: string | boolean;
};

const variantMap: Record<
  ButtonVariant,
  {
    muiVariant: LegacyButtonVariant;
    color: NonNullable<MuiButtonProps["color"]>;
    sx?: SxProps<Theme>;
  }
> = {
  primary: { muiVariant: "contained", color: "primary" },
  secondary: { muiVariant: "contained", color: "secondary" },
  outline: { muiVariant: "outlined", color: "primary" },
  ghost: {
    muiVariant: "text",
    color: "inherit",
    sx: {
      color: "text.secondary",
      "&:hover": { color: "text.primary", bgcolor: "action.hover" },
    },
  },
  danger: { muiVariant: "contained", color: "error" },
  link: {
    muiVariant: "text",
    color: "primary",
    sx: {
      minHeight: "auto",
      minWidth: "auto",
      p: 0,
      verticalAlign: "baseline",
      "&:hover": {
        bgcolor: "transparent",
        textDecoration: "underline",
        textUnderlineOffset: 3,
      },
    },
  },
};

const legacyVariants = new Set<LegacyButtonVariant>(["contained", "outlined", "text"]);

function isLegacyVariant(variant: ButtonProps["variant"]): variant is LegacyButtonVariant {
  return Boolean(variant && legacyVariants.has(variant as LegacyButtonVariant));
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "medium",
    loading = false,
    loadingText,
    iconOnly = false,
    disabled,
    startIcon,
    endIcon,
    color,
    children,
    sx,
    ...props
  },
  ref,
) {
  const mapped = isLegacyVariant(variant) ? null : variantMap[variant];
  const muiVariant = mapped?.muiVariant ?? (variant as LegacyButtonVariant);
  const spinnerSize =
    size === "small" ? designTokens.icon.xs : size === "large" ? designTokens.icon.md : 18;
  const content = loading && loadingText !== undefined ? loadingText : children;
  const componentSx: SxProps<Theme> = {
    ...(mapped?.sx ?? {}),
    ...(iconOnly
      ? {
          width: designTokens.control.iconButton[size],
          minWidth: designTokens.control.iconButton[size],
          px: 0,
          "& .MuiButton-startIcon, & .MuiButton-endIcon": { m: 0 },
        }
      : {}),
  };

  return (
    <MuiButton
      {...props}
      ref={ref}
      variant={muiVariant}
      color={color ?? mapped?.color}
      size={size}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-design-variant={variant}
      startIcon={
        !iconOnly && loading ? (
          <CircularProgress size={spinnerSize} color="inherit" aria-hidden />
        ) : (
          startIcon
        )
      }
      endIcon={loading ? undefined : endIcon}
      sx={[componentSx, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}
    >
      {iconOnly && loading ? (
        <CircularProgress size={spinnerSize} color="inherit" aria-hidden />
      ) : (
        content
      )}
    </MuiButton>
  );
});
