import { fa, type StatusKey } from "@/i18n/fa";
import {
  gregorianToJalaliDateTimeString,
  gregorianToJalaliString,
} from "@/utils/jalali";

export function formatDate(iso: string | null | undefined): string {
  return gregorianToJalaliString(iso);
}

export function formatDateTime(iso: string | null | undefined): string {
  return gregorianToJalaliDateTimeString(iso);
}

export function statusLabel(status: string): string {
  return fa.statusLabels[status as StatusKey] ?? status;
}

/** Hide CSV-imported source lines from marketing lead notes in the UI. */
export function marketingLeadDisplayNote(note: string | null | undefined): string {
  if (!note) return "";
  return note
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("منبع:"))
    .join("\n")
    .trim();
}

export { toDatetimeLocalValue, fromDatetimeLocalValue } from "@/utils/jalali";
export {
  toPersianDigits,
  fromPersianDigits,
  formatNumber,
  formatMoney,
  formatPhone,
  formatPercent,
  formatText,
  persianDigitsFieldProps,
  persianDecimalFieldProps,
  persianNumberFieldProps,
  persianMoneyFieldProps,
  parseMoneyInput,
  formatMoneyInput,
} from "@/utils/digits";
