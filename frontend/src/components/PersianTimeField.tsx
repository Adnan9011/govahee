import { TextField } from "@/components/ui";

import { fromPersianDigits, toPersianDigits } from "@/utils/digits";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: "small" | "medium";
  fullWidth?: boolean;
};

function normalizeTimeInput(raw: string): string {
  const digits = fromPersianDigits(raw).replace(/[^\d]/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function padTime(value: string): string {
  const match = /^(\d{1,2}):?(\d{0,2})$/.exec(value);
  if (!match) return value;
  const hours = match[1].padStart(2, "0");
  const minutes = (match[2] ?? "0").padStart(2, "0");
  return `${hours}:${minutes}`;
}

function isValidTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function PersianTimeField({
  label,
  value,
  onChange,
  disabled,
  size = "small",
  fullWidth = true,
}: Props) {
  return (
    <TextField
      label={label}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      placeholder="۰۸:۰۰"
      inputProps={{ dir: "ltr", inputMode: "numeric", maxLength: 5 }}
      value={value ? toPersianDigits(value) : ""}
      onChange={(e) => onChange(normalizeTimeInput(e.target.value))}
      onBlur={() => {
        if (!value) return;
        const padded = padTime(value);
        if (isValidTime(padded)) onChange(padded);
      }}
      error={Boolean(value) && !isValidTime(padTime(value))}
    />
  );
}

export function formatTimeLabel(value: string): string {
  return toPersianDigits(value);
}
