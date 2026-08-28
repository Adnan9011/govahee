import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import DateObject from "react-date-object";
import type { CSSProperties } from "react";
import { gregorianIsoToJalaliParts, jalaliPartsToGregorianIso } from "@/utils/jalali";
import { jalaliInputStyle, jalaliPickerCommonProps } from "@/components/jalaliPickerStyles";
import {
  JalaliFieldShell,
  jalaliFieldHeight,
  type JalaliFieldSize,
} from "@/components/JalaliFieldShell";

export type JalaliDateFieldProps = {
  label: string;
  value: string;
  onChange: (gregorianIso: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  size?: JalaliFieldSize;
  clearable?: boolean;
};

function todayPickerValue() {
  const now = new Date();
  return new DateObject({ calendar: persian, locale: persian_fa, date: now });
}

export function JalaliDateField({
  label,
  value,
  onChange,
  required,
  disabled,
  error,
  helperText,
  size = "medium",
  clearable = true,
}: JalaliDateFieldProps) {
  const parts = gregorianIsoToJalaliParts(value);
  const pickerValue = parts
    ? new DateObject({
        calendar: persian,
        locale: persian_fa,
        year: parts.jy,
        month: parts.jm,
        day: parts.jd,
      })
    : null;
  const currentDate = pickerValue ?? todayPickerValue();
  const showClear = Boolean(clearable && value && !disabled);

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
          onChange(jalaliPartsToGregorianIso(d.year, d.month.number, d.day));
        }}
        format="YYYY/MM/DD"
        placeholder="انتخاب تاریخ"
        style={
          {
            ...jalaliInputStyle,
            minHeight: jalaliFieldHeight(size),
            ...(showClear ? { paddingInlineEnd: 34 } : {}),
            ...(error ? { borderColor: "var(--ds-color-error, #f87171)" } : {}),
            ...(disabled ? { opacity: 0.62, cursor: "not-allowed" } : {}),
          } as CSSProperties
        }
      />
    </JalaliFieldShell>
  );
}
