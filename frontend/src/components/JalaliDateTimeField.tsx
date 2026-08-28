import DatePicker from "react-multi-date-picker";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import DateObject from "react-date-object";
import {
  toGregorian,
  toJalaali,
} from "jalaali-js";
import type { CSSProperties } from "react";
import { jalaliInputStyle, jalaliPickerCommonProps } from "@/components/jalaliPickerStyles";
import {
  JalaliFieldShell,
  jalaliFieldHeight,
  type JalaliFieldSize,
} from "@/components/JalaliFieldShell";

export type JalaliDateTimeFieldProps = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  size?: JalaliFieldSize;
  clearable?: boolean;
  /** When set and value is present, tint the input (e.g. next-visit highlight). */
  filledTone?: "brown";
};

function isoToPickerValue(iso: string): DateObject | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return new DateObject({
    calendar: persian,
    locale: persian_fa,
    year: j.jy,
    month: j.jm,
    day: j.jd,
    hour: d.getHours(),
    minute: d.getMinutes(),
  });
}

function pickerToIso(date: DateObject): string {
  const g = toGregorian(date.year, date.month.number, date.day);
  const local = new Date(
    g.gy,
    g.gm - 1,
    g.gd,
    date.hour ?? 0,
    date.minute ?? 0,
    0,
    0
  );
  return local.toISOString();
}

function todayPickerValue() {
  const now = new Date();
  return new DateObject({ calendar: persian, locale: persian_fa, date: now });
}

export function JalaliDateTimeField({
  label,
  value,
  onChange,
  required,
  disabled,
  error,
  helperText,
  size = "medium",
  clearable = true,
  filledTone,
}: JalaliDateTimeFieldProps) {
  const pickerValue = isoToPickerValue(value);
  const currentDate = pickerValue ?? todayPickerValue();
  const showClear = Boolean(clearable && value && !disabled);
  const brownFilled = Boolean(filledTone === "brown" && value);

  return (
    <JalaliFieldShell
      label={label}
      required={required}
      disabled={disabled}
      error={error}
      helperText={helperText}
      size={size}
      clearable={showClear}
      onClear={() => onChange("")}
    >
      <DatePicker
        {...jalaliPickerCommonProps}
        calendar={persian}
        locale={persian_fa}
        currentDate={currentDate}
        value={pickerValue}
        disabled={disabled}
        onChange={(date) => {
          if (!date) {
            onChange("");
            return;
          }
          const d = Array.isArray(date) ? date[0] : date;
          if (!d) return;
          onChange(pickerToIso(d));
        }}
        format="YYYY/MM/DD HH:mm"
        placeholder="انتخاب تاریخ و زمان"
        plugins={[<TimePicker key="t" position="bottom" hideSeconds />]}
        style={
          {
            ...jalaliInputStyle,
            minHeight: jalaliFieldHeight(size),
            ...(showClear ? { paddingInlineEnd: 34 } : {}),
            ...(brownFilled
              ? {
                  borderColor: "#8D6E63",
                  color: "#5D4037",
                  backgroundColor: "rgba(141, 110, 99, 0.12)",
                }
              : {}),
            ...(error ? { borderColor: "var(--ds-color-error, #f87171)" } : {}),
            ...(disabled ? { opacity: 0.62, cursor: "not-allowed" } : {}),
          } as CSSProperties
        }
      />
    </JalaliFieldShell>
  );
}
