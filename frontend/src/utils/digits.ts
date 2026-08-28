import type { ChangeEvent } from "react";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";

/** Convert Western/Arabic-Indic digits to Persian (۰–۹). */
export function toPersianDigits(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d)
    .replace(/[٠-٩]/g, (d) => PERSIAN_DIGITS[ARABIC_INDIC.indexOf(d)] ?? d);
}

/** Convert Persian/Arabic-Indic digits to Western (0–9) for API payloads. */
export function fromPersianDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)));
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return toPersianDigits(value.toLocaleString("fa-IR", options));
}

export function formatMoney(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return toPersianDigits(value);
  return formatNumber(n);
}

export function formatPhone(value: string | null | undefined): string {
  if (!value) return "—";
  return toPersianDigits(value);
}

export function formatPercent(value: number): string {
  return `${formatNumber(value)}٪`;
}

/** Apply Persian digits to any user-visible string (e.g. alert messages). */
export function formatText(value: string): string {
  return toPersianDigits(value);
}

export function persianDigitsFieldProps(
  value: string,
  onChange: (value: string) => void
): { value: string; onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void } {
  return {
    value: toPersianDigits(value),
    onChange: (e) => onChange(fromPersianDigits(e.target.value)),
  };
}

/** Persian digits for decimal inputs (e.g. commission percent). */
export function persianDecimalFieldProps(
  value: string,
  onChange: (value: string) => void
): {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  inputMode: "decimal";
} {
  return {
    value: toPersianDigits(value),
    onChange: (e) => {
      let raw = fromPersianDigits(e.target.value).replace(/[^\d.]/g, "");
      const dotIndex = raw.indexOf(".");
      if (dotIndex >= 0) {
        raw = `${raw.slice(0, dotIndex + 1)}${raw.slice(dotIndex + 1).replace(/\./g, "")}`;
      }
      onChange(raw);
    },
    inputMode: "decimal",
  };
}

export function persianNumberFieldProps(
  value: number,
  onChange: (value: number) => void
): { value: string; onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; inputMode: "numeric" } {
  return {
    value: toPersianDigits(String(value)),
    onChange: (e) => {
      const raw = fromPersianDigits(e.target.value).replace(/[^\d.-]/g, "");
      onChange(raw === "" || raw === "-" ? 0 : Number(raw));
    },
    inputMode: "numeric",
  };
}

/** Strip grouping separators; keep Western digits only for API payloads. */
export function parseMoneyInput(value: string): string {
  return fromPersianDigits(value).replace(/[^\d]/g, "");
}

/** Persian digits with fa-IR thousand separators for money inputs. */
export function formatMoneyInput(value: string): string {
  const digits = parseMoneyInput(value);
  if (!digits) return "";
  const n = Number(digits);
  if (Number.isNaN(n)) return toPersianDigits(value);
  return formatNumber(n);
}

export function persianMoneyFieldProps(
  value: string,
  onChange: (value: string) => void
): {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  inputMode: "numeric";
} {
  return {
    value: formatMoneyInput(value),
    onChange: (e) => onChange(parseMoneyInput(e.target.value)),
    inputMode: "numeric",
  };
}
