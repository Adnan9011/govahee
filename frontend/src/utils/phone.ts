import type { ChangeEvent } from "react";
import { fromPersianDigits, toPersianDigits } from "@/utils/digits";

/** Normalize Iranian mobile input (same rules as backend). */
export function normalizePhone(value: string): string {
  // Strip separators / bidi marks; keep digits and a leading +.
  let v = fromPersianDigits(value.trim()).replace(/[^\d+]/g, "");
  if (v.startsWith("00")) v = `+${v.slice(2)}`;
  if (v.startsWith("+98")) v = `0${v.slice(3)}`;
  else if (v.startsWith("98") && v.length >= 12) v = `0${v.slice(2)}`;
  else if (/^\d{10}$/.test(v) && !v.startsWith("0")) v = `0${v}`;
  // Drop a leftover + (e.g. "+912..." without country code).
  if (v.startsWith("+")) v = v.slice(1);
  return v;
}

export function isValidIranMobilePhone(value: string): boolean {
  const phone = normalizePhone(value);
  return /^09\d{9}$/.test(phone);
}

/** Build a `tel:` href from any stored phone (mobile or landline). */
export function toTelHref(value: string | null | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const digits = fromPersianDigits(value.trim()).replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}


/** Keep only digits while typing; cap at 11 (Iranian mobile). */
export function sanitizeIranMobileInput(value: string): string {
  return fromPersianDigits(value).replace(/[^\d]/g, "").slice(0, 11);
}

export function persianIranMobileFieldProps(
  value: string,
  onChange: (value: string) => void,
): {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  inputProps: { dir: "ltr"; inputMode: "numeric"; maxLength: number };
} {
  const sanitized = sanitizeIranMobileInput(value);
  return {
    value: toPersianDigits(sanitized),
    onChange: (e) => {
      onChange(sanitizeIranMobileInput(fromPersianDigits(e.target.value)));
    },
    inputProps: { dir: "ltr", inputMode: "numeric", maxLength: 11 },
  };
}
