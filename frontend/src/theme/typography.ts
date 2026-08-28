import type { TypographyOptions } from "@mui/material/styles/createTypography";
import { designTokens } from "@/theme/tokens";

const { typography } = designTokens;

export const typographyOptions: TypographyOptions = {
  fontFamily: typography.fontFamily,
  fontSize: 15,
  h3: {
    fontSize: typography.size["3xl"],
    fontWeight: typography.weight.extrabold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: "-0.02em",
  },
  h4: {
    fontSize: typography.size["2xl"],
    fontWeight: typography.weight.extrabold,
    lineHeight: typography.lineHeight.title,
    letterSpacing: "-0.02em",
  },
  h5: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.title,
  },
  h6: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.compact,
  },
  subtitle1: {
    fontSize: "0.95rem",
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.compact,
  },
  subtitle2: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.compact,
  },
  body1: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.body,
  },
  body2: {
    fontSize: typography.size.sm,
    lineHeight: 1.65,
  },
  caption: {
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.compact,
    letterSpacing: 0,
  },
  button: {
    fontSize: "0.9rem",
    fontWeight: typography.weight.semibold,
    letterSpacing: 0,
    lineHeight: 1.5,
  },
};

export const typographyRoles = {
  pageTitle: { variant: "h4", color: "text.primary" },
  sectionTitle: { variant: "h5", color: "text.primary" },
  cardTitle: { variant: "h6", color: "text.primary" },
  body: { variant: "body1", color: "text.primary" },
  smallText: { variant: "body2", color: "text.secondary" },
  caption: { variant: "caption", color: "text.secondary" },
  label: { variant: "subtitle2", color: "text.primary" },
  helperText: { variant: "caption", color: "text.secondary" },
  errorText: { variant: "caption", color: "error.main" },
} as const;
