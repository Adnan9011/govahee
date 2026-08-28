import {
  Checkbox as MuiCheckbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch as MuiSwitch,
} from "@/components/ui/primitives";
import {
  FormControl,
  FormHelperText,
  FormLabel,
  type CheckboxProps as MuiCheckboxProps,
  type FormControlLabelProps,
  type RadioGroupProps,
  type SwitchProps as MuiSwitchProps,
} from "@mui/material";
import type { ReactNode } from "react";

export type CheckboxProps = MuiCheckboxProps & {
  label: ReactNode;
  helperText?: ReactNode;
  labelPlacement?: FormControlLabelProps["labelPlacement"];
};

export function Checkbox({
  label,
  helperText,
  labelPlacement = "end",
  ...props
}: CheckboxProps) {
  return (
    <FormControl error={props.color === "error"}>
      <FormControlLabel
        label={label}
        labelPlacement={labelPlacement}
        disabled={props.disabled}
        control={<MuiCheckbox {...props} />}
      />
      {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
    </FormControl>
  );
}

export type RadioOption = {
  value: string | number;
  label: ReactNode;
  disabled?: boolean;
};

export type RadioFieldProps = Omit<RadioGroupProps, "children"> & {
  label?: ReactNode;
  options: readonly RadioOption[];
  helperText?: ReactNode;
  error?: boolean;
  disabled?: boolean;
  row?: boolean;
};

export function RadioField({
  label,
  options,
  helperText,
  error,
  disabled,
  row,
  ...props
}: RadioFieldProps) {
  return (
    <FormControl error={error} disabled={disabled}>
      {label ? <FormLabel sx={{ mb: 0.5 }}>{label}</FormLabel> : null}
      <RadioGroup {...props} row={row}>
        {options.map((option) => (
          <FormControlLabel
            key={String(option.value)}
            value={option.value}
            label={option.label}
            disabled={option.disabled}
            control={<Radio />}
          />
        ))}
      </RadioGroup>
      {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
    </FormControl>
  );
}

export type SwitchProps = MuiSwitchProps & {
  label: ReactNode;
  helperText?: ReactNode;
  labelPlacement?: FormControlLabelProps["labelPlacement"];
};

export function Switch({
  label,
  helperText,
  labelPlacement = "end",
  ...props
}: SwitchProps) {
  return (
    <FormControl>
      <FormControlLabel
        label={label}
        labelPlacement={labelPlacement}
        disabled={props.disabled}
        control={<MuiSwitch {...props} />}
      />
      {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
    </FormControl>
  );
}
