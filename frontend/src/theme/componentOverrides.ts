import type { Components, Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { InstantTransition } from "@/components/InstantTransition";
import { designTokens, cssDesignVariables } from "@/theme/tokens";
import { toPersianDigits } from "@/utils/digits";

const { color, control, motion, radius, shadow, spacing, typography, zIndex } = designTokens;

export function createComponentOverrides(): Components<Theme> {
  return {
    MuiTablePagination: {
      defaultProps: {
        rowsPerPageOptions: [
          { label: "۱۰", value: 10 },
          { label: "۲۰", value: 20 },
          { label: "۵۰", value: 50 },
          { label: "۱۰۰", value: 100 },
        ],
        labelDisplayedRows: ({ from, to, count }) =>
          `${toPersianDigits(from)}–${toPersianDigits(to)} از ${
            count === -1 ? `بیش از ${toPersianDigits(to)}` : toPersianDigits(count)
          }`,
        slotProps: {
          select: {
            renderValue: (value) => toPersianDigits(String(value)),
          },
        },
      },
      styleOverrides: {
        toolbar: {
          minHeight: control.height.large,
          paddingInline: spacing[2],
          gap: spacing[1],
        },
        selectLabel: { color: color.text.secondary },
        displayedRows: { color: color.text.secondary },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        ":root": cssDesignVariables,
        html: {
          fontSize: "15px",
          "@media (min-width: 1280px)": { fontSize: "16px" },
          "@media (min-width: 1600px)": { fontSize: "17px" },
        },
        body: {
          fontFamily: typography.fontFamily,
          backgroundColor: color.background.default,
          backgroundImage: `radial-gradient(ellipse 90% 55% at 50% -15%, ${alpha(
            color.brand.primary,
            0.14,
          )}, transparent 55%)`,
        },
        "input, textarea, select, button, [dir='ltr']": {
          fontFamily: typography.fontFamily,
        },
        "::selection": {
          backgroundColor: alpha(color.brand.primary, 0.3),
          color: color.text.primary,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          minHeight: control.height.medium,
          textTransform: "none",
          fontWeight: typography.weight.semibold,
          borderRadius: radius.md,
          paddingInline: spacing[2.5],
          whiteSpace: "nowrap",
          transition: `transform ${motion.duration.shortest}ms ease, box-shadow ${motion.duration.shorter}ms ease, background-color ${motion.duration.shorter}ms ease, border-color ${motion.duration.shorter}ms ease`,
          "&.Mui-focusVisible": {
            outline: `2px solid ${color.border.focus}`,
            outlineOffset: 2,
            boxShadow: shadow.focus,
          },
          "&:active:not(.Mui-disabled)": {
            transform: "scale(0.98)",
          },
          "&.Mui-disabled": {
            cursor: "not-allowed",
          },
        },
        sizeSmall: {
          minHeight: control.height.small,
          paddingInline: spacing[1.5],
          fontSize: typography.size.sm,
        },
        sizeMedium: {
          minHeight: control.height.medium,
        },
        sizeLarge: {
          minHeight: control.height.large,
          paddingInline: spacing[3],
          fontSize: "1rem",
        },
        contained: {
          boxShadow: shadow.none,
          "&:hover": {
            boxShadow: `0 6px 24px ${alpha(color.brand.primary, 0.28)}`,
          },
        },
        outlined: {
          borderColor: alpha(color.brand.primary, 0.38),
          "&:hover": {
            borderColor: color.brand.primary,
            backgroundColor: alpha(color.brand.primary, 0.08),
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: control.iconButton.medium,
          minHeight: control.iconButton.medium,
          "&.Mui-focusVisible": {
            outline: `2px solid ${color.border.focus}`,
            outlineOffset: 2,
          },
        },
        sizeSmall: {
          minWidth: control.iconButton.small,
          minHeight: control.iconButton.small,
        },
        sizeLarge: {
          minWidth: control.iconButton.large,
          minHeight: control.iconButton.large,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: color.background.surface,
          border: `1px solid ${color.border.default}`,
          borderRadius: radius.lg,
          boxShadow: shadow.md,
          transition: `transform ${motion.duration.shorter}ms ${motion.easing.easeOut}, box-shadow ${motion.duration.shorter}ms ease`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: color.background.surface,
          borderColor: color.border.default,
          borderRadius: radius.lg,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(color.background.default, 0.88),
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${color.border.default}`,
          boxShadow: shadow.none,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: color.background.default,
          borderColor: color.border.default,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          marginInline: spacing[1],
          marginBottom: spacing["0.5"],
          transition: `background-color ${motion.duration.shorter}ms ease, border-color ${motion.duration.shorter}ms ease`,
          "&.Mui-selected": {
            backgroundColor: alpha(color.brand.primary, 0.14),
            borderInlineStart: `3px solid ${color.brand.primary}`,
            "&:hover": { backgroundColor: alpha(color.brand.primary, 0.2) },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: color.border.default,
        },
        head: {
          fontWeight: typography.weight.bold,
          fontSize: "0.85rem",
          color: color.text.secondary,
          backgroundColor: alpha(color.background.elevated, 0.72),
          textTransform: "none",
          "@media (min-width: 1280px)": { fontSize: "0.92rem" },
          "@media (min-width: 1600px)": { fontSize: "0.98rem" },
        },
        body: {
          fontSize: "0.9rem",
          "@media (min-width: 1280px)": { fontSize: "0.95rem" },
          "@media (min-width: 1600px)": { fontSize: "1rem" },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&.Mui-selected": { backgroundColor: alpha(color.brand.primary, 0.1) },
          "&:hover": { backgroundColor: alpha(color.brand.primary, 0.06) },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: control.height.large,
          backgroundColor: color.background.elevated,
          borderRadius: radius.md,
          fontSize: typography.size.md,
          "& fieldset": { borderColor: color.border.default },
          "&:hover fieldset": { borderColor: alpha(color.brand.primary, 0.45) },
          "&.Mui-focused fieldset": {
            borderColor: color.border.focus,
            borderWidth: 2,
          },
          "&.Mui-error fieldset": {
            borderColor: color.status.error,
          },
          "&.Mui-disabled": {
            backgroundColor: alpha(color.background.elevated, 0.55),
          },
          "&.MuiInputBase-sizeSmall": {
            minHeight: control.height.medium,
          },
          "&.MuiInputBase-multiline": {
            alignItems: "flex-start",
            padding: `${spacing[2]}px ${spacing[1.5]}px`,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.9rem",
          "&.MuiInputLabel-shrink": {
            backgroundColor: color.background.surface,
            paddingInline: spacing["0.5"],
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginInline: 0,
          marginTop: spacing["0.5"],
          fontSize: typography.size.xs,
          lineHeight: typography.lineHeight.compact,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: color.text.primary,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold,
          lineHeight: typography.lineHeight.compact,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          minHeight: 28,
          fontWeight: typography.weight.semibold,
          fontSize: "0.78rem",
        },
        sizeSmall: {
          height: 28,
          borderRadius: radius.pill,
          fontSize: "0.76rem",
          fontWeight: typography.weight.bold,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          fontSize: "0.9rem",
          lineHeight: typography.lineHeight.compact,
        },
        standardError: {
          backgroundColor: alpha(color.status.error, 0.12),
          border: `1px solid ${alpha(color.status.error, 0.28)}`,
        },
        standardSuccess: {
          backgroundColor: alpha(color.status.success, 0.12),
          border: `1px solid ${alpha(color.status.success, 0.28)}`,
        },
        standardWarning: {
          backgroundColor: alpha(color.status.warning, 0.12),
          border: `1px solid ${alpha(color.status.warning, 0.28)}`,
        },
        standardInfo: {
          backgroundColor: alpha(color.status.info, 0.1),
          border: `1px solid ${alpha(color.status.info, 0.22)}`,
        },
      },
    },
    MuiBackdrop: {
      defaultProps: {
        TransitionComponent: InstantTransition,
      },
    },
    MuiDialog: {
      defaultProps: {
        TransitionComponent: InstantTransition,
        PaperProps: { dir: "rtl" },
      },
      styleOverrides: {
        paper: {
          backgroundColor: color.background.surface,
          border: `1px solid ${color.border.default}`,
          borderRadius: radius.xl,
          boxShadow: shadow.lg,
        },
      },
    },
    MuiSnackbar: {
      defaultProps: {
        TransitionComponent: InstantTransition,
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: `${spacing[3]}px ${spacing[3]}px ${spacing[1]}px`,
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
          lineHeight: typography.lineHeight.title,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: `${spacing[3]}px`,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: `${spacing[2]}px ${spacing[3]}px ${spacing[3]}px`,
          gap: spacing[1],
        },
      },
    },
    MuiMenu: {
      defaultProps: {
        TransitionComponent: InstantTransition,
        slotProps: {
          paper: { elevation: 8 },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: control.height.medium,
          borderRadius: radius.sm,
          marginInline: spacing["0.5"],
          whiteSpace: "nowrap",
          "&.Mui-focusVisible": {
            backgroundColor: alpha(color.brand.primary, 0.12),
          },
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
      styleOverrides: {
        tooltip: {
          maxWidth: 320,
          padding: `${spacing[1]}px ${spacing[1.5]}px`,
          backgroundColor: color.background.elevated,
          border: `1px solid ${color.border.strong}`,
          borderRadius: radius.sm,
          color: color.text.primary,
          fontSize: typography.size.xs,
          lineHeight: typography.lineHeight.compact,
          boxShadow: shadow.sm,
        },
      },
    },
    MuiPopover: {
      defaultProps: {
        TransitionComponent: InstantTransition,
      },
      styleOverrides: {
        root: { zIndex: zIndex.popover },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: control.height.medium },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: control.height.medium,
          fontSize: "0.9rem",
          fontWeight: typography.weight.semibold,
        },
      },
    },
  };
}
