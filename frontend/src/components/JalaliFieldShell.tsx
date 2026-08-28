import { Box, FormControl, FormHelperText, InputLabel } from "@mui/material";
import type { ReactNode } from "react";
import { FieldClearButton } from "@/components/ui/FieldClearButton";
import { designTokens } from "@/theme/tokens";

export type JalaliFieldSize = "small" | "medium";

export type JalaliFieldShellProps = {
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  size?: JalaliFieldSize;
  clearable?: boolean;
  onClear?: () => void;
  children: ReactNode;
};

export function jalaliFieldHeight(size: JalaliFieldSize = "medium"): number {
  return size === "small"
    ? designTokens.control.height.medium
    : designTokens.control.height.large;
}

/**
 * Outlined floating-label shell so date pickers align with MUI TextField/Select.
 */
export function JalaliFieldShell({
  label = "",
  required,
  disabled,
  error,
  helperText,
  size = "medium",
  clearable = false,
  onClear,
  children,
}: JalaliFieldShellProps) {
  const showLabel = Boolean(label);
  const labelText = `${label}${required ? " *" : ""}`;
  const showClear = Boolean(clearable && onClear && !disabled);

  return (
    <FormControl
      fullWidth
      variant="outlined"
      size={size}
      error={error}
      disabled={disabled}
      sx={{
        minWidth: 0,
        "& .rmdp-container": { width: "100%", display: "block" },
        "& .jalali-picker-input": {
          minHeight: jalaliFieldHeight(size),
          ...(showClear ? { paddingInlineEnd: 34 } : {}),
        },
      }}
    >
      {showLabel ? (
        <InputLabel shrink>
          {labelText}
        </InputLabel>
      ) : null}
      <Box sx={{ position: "relative", width: "100%" }}>
        {children}
        {showClear ? (
          <FieldClearButton
            edge={false}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClear?.();
            }}
            sx={{
              position: "absolute",
              top: "50%",
              insetInlineEnd: 4,
              transform: "translateY(-50%)",
              zIndex: 2,
            }}
          />
        ) : null}
      </Box>
      {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
    </FormControl>
  );
}
