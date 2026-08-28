import type { CSSProperties } from "react";
import { designTokens } from "@/theme/tokens";

export const jalaliInputStyle: CSSProperties = {
  width: "100%",
  minHeight: designTokens.control.height.large,
  padding: `0 ${designTokens.spacing["1.5"]}px`,
  fontSize: designTokens.typography.size.md,
  fontFamily: designTokens.typography.fontFamily,
  borderRadius: designTokens.radius.md,
  border: `1px solid ${designTokens.color.border.default}`,
  backgroundColor: designTokens.color.background.elevated,
  color: designTokens.color.text.primary,
  boxSizing: "border-box",
  outline: "none",
};

export const jalaliPickerCommonProps = {
  portal: true,
  zIndex: designTokens.zIndex.datePicker,
  calendarPosition: "bottom-center" as const,
  highlightToday: true,
  containerClassName: "jalali-picker-container",
  className: "jalali-picker-input",
};
