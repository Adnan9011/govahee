import {
  MenuItem,
  TextField,
  type TextFieldProps,
} from "@mui/material";
import type { ReactNode } from "react";

export type SelectOption = {
  value: string | number;
  label: ReactNode;
  disabled?: boolean;
};

export type SelectProps = Omit<TextFieldProps, "variant" | "select"> & {
  options?: readonly SelectOption[];
  placeholder?: ReactNode;
};

export function Select({
  options,
  placeholder,
  children,
  fullWidth = true,
  size = "medium",
  ...props
}: SelectProps) {
  return (
    <TextField
      {...props}
      select
      fullWidth={fullWidth}
      size={size}
      variant="outlined"
    >
      {placeholder !== undefined ? (
        <MenuItem value="" disabled>
          {placeholder}
        </MenuItem>
      ) : null}
      {children ??
        options?.map((option) => (
          <MenuItem key={String(option.value)} value={option.value} disabled={option.disabled}>
            {option.label}
          </MenuItem>
        ))}
    </TextField>
  );
}
