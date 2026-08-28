import {
  Chip,
  type ChipProps,
} from "@mui/material";
import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "error" | "info";

export type BadgeProps = Omit<ChipProps, "label" | "color"> & {
  children: ReactNode;
  tone?: BadgeTone;
};

const toneColor: Record<BadgeTone, ChipProps["color"]> = {
  neutral: "default",
  primary: "primary",
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
};

export function Badge({
  children,
  tone = "neutral",
  size = "small",
  ...props
}: BadgeProps) {
  return <Chip {...props} size={size} color={toneColor[tone]} label={children} />;
}
