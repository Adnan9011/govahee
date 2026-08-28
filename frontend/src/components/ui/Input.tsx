import {
  InputAdornment,
  TextField as MuiTextField,
  type TextFieldProps,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import {
  isValidElement,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { FieldClearButton } from "@/components/ui/FieldClearButton";

export type InputProps = Omit<TextFieldProps, "variant" | "select" | "multiline">;

export type ClearableTextFieldProps = TextFieldProps & {
  /** Show an in-field clear (×) when the value is non-empty. Defaults to true for plain controlled fields. */
  clearable?: boolean;
  /** Optional clear handler; defaults to emitting onChange with an empty string. */
  onClear?: () => void;
};

function hasClearableText(value: TextFieldProps["value"]): boolean {
  if (value == null) return false;
  return String(value).length > 0;
}

function shouldEnableClear(props: ClearableTextFieldProps): boolean {
  const { clearable, disabled, select, multiline, type, onChange, onClear, value } =
    props;
  if (clearable === false) return false;
  if (disabled || select || multiline) return false;
  if (type === "password" || type === "file" || type === "hidden" || type === "search") {
    return false;
  }
  if (!onChange && !onClear) return false;
  if (!(clearable ?? true)) return false;
  return hasClearableText(value);
}

function emitClearChange(
  onChange: TextFieldProps["onChange"] | undefined,
  onClear: (() => void) | undefined,
) {
  onClear?.();
  if (!onChange) return;
  const target = {
    value: "",
  } as EventTarget & HTMLInputElement;
  const event = {
    target,
    currentTarget: target,
  } as ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
  onChange(event);
}

function mergeEndAdornment(
  existing: ReactNode | undefined,
  clearButton: ReactNode,
): ReactNode {
  if (!existing) {
    return <InputAdornment position="end">{clearButton}</InputAdornment>;
  }

  const existingChildren =
    isValidElement(existing) && existing.type === InputAdornment
      ? (existing as ReactElement<{ children?: ReactNode }>).props.children
      : existing;

  return (
    <InputAdornment position="end">
      {clearButton}
      {existingChildren}
    </InputAdornment>
  );
}

/**
 * Migration-safe TextField facade. Existing form behavior and polymorphic
 * props stay intact while styling is owned by the design-system theme.
 * Controlled plain text fields get an in-box clear (×) when filled.
 */
export function TextField({
  clearable,
  onClear,
  InputProps,
  ...props
}: ClearableTextFieldProps) {
  const showClear = shouldEnableClear({ clearable, onClear, InputProps, ...props });
  const clearButton = showClear ? (
    <FieldClearButton
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        emitClearChange(props.onChange, onClear);
      }}
    />
  ) : null;

  const mergedInputProps = clearButton
    ? {
        ...InputProps,
        endAdornment: mergeEndAdornment(InputProps?.endAdornment, clearButton),
      }
    : InputProps;

  return (
    <MuiTextField
      {...props}
      variant={props.variant ?? "outlined"}
      InputProps={mergedInputProps}
    />
  );
}

export function Input({
  fullWidth = true,
  size = "medium",
  ...props
}: InputProps) {
  return <TextField {...props} fullWidth={fullWidth} size={size} />;
}

export type TextareaProps = Omit<TextFieldProps, "variant" | "select" | "multiline"> & {
  minRows?: number;
  maxRows?: number;
};

export function Textarea({
  fullWidth = true,
  minRows = 4,
  ...props
}: TextareaProps) {
  return (
    <MuiTextField
      {...props}
      fullWidth={fullWidth}
      variant="outlined"
      multiline
      minRows={minRows}
    />
  );
}

export type SearchInputProps = InputProps & {
  searchIcon?: ReactNode;
};

export function SearchInput({
  searchIcon = <SearchIcon fontSize="small" />,
  InputProps,
  inputProps,
  ...props
}: SearchInputProps) {
  return (
    <Input
      {...props}
      type="search"
      inputProps={{
        "aria-label": typeof props.label === "string" ? props.label : "جستجو",
        ...inputProps,
      }}
      InputProps={{
        startAdornment: <InputAdornment position="start">{searchIcon}</InputAdornment>,
        ...InputProps,
      }}
    />
  );
}
