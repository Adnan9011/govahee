import { jalaaliMonthLength, toGregorian, toJalaali } from "jalaali-js";
import { toPersianDigits } from "@/utils/digits";

const pad = (n: number) => String(n).padStart(2, "0");

export function gregorianToJalaliString(iso: string | null | undefined): string {
  if (!iso) return "—";
  const datePart = iso.split("T")[0];
  const [gy, gm, gd] = datePart.split("-").map(Number);
  if (!gy || !gm || !gd) return "—";
  const j = toJalaali(gy, gm, gd);
  return toPersianDigits(`${j.jy}/${pad(j.jm)}/${pad(j.jd)}`);
}

export function gregorianToJalaliDateTimeString(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const time = new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tehran",
  }).format(d);
  // In RTL, "date - time" renders visually as "time - date" (e.g. ۱۷:۵۰ - ۱۴۰۵/۰۵/۰۶).
  return toPersianDigits(`${j.jy}/${pad(j.jm)}/${pad(j.jd)} - ${time}`);
}

/** ISO date (YYYY-MM-DD) from Jalali parts */
export function jalaliPartsToGregorianIso(jy: number, jm: number, jd: number): string {
  const g = toGregorian(jy, jm, jd);
  return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`;
}

export function gregorianIsoToJalaliParts(iso: string): { jy: number; jm: number; jd: number } | null {
  if (!iso) return null;
  const [gy, gm, gd] = iso.split("T")[0].split("-").map(Number);
  if (!gy || !gm || !gd) return null;
  const j = toJalaali(gy, gm, gd);
  return { jy: j.jy, jm: j.jm, jd: j.jd };
}

export const JALALI_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

function addDaysToGregorianIso(iso: string, days: number): string {
  const [gy, gm, gd] = iso.split("T")[0].split("-").map(Number);
  const d = new Date(gy, gm - 1, gd);
  d.setDate(d.getDate() + days);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Short axis label for chart buckets */
export function formatChartBucketLabel(
  iso: string,
  granularity: "day" | "week" | "month"
): string {
  const parts = gregorianIsoToJalaliParts(iso);
  if (!parts) return "—";
  const monthName = JALALI_MONTH_NAMES[parts.jm - 1] ?? "";
  if (granularity === "month") {
    return toPersianDigits(`${monthName} ${parts.jy}`);
  }
  if (granularity === "week") {
    const weekEnd = addDaysToGregorianIso(iso, 6);
    const endParts = gregorianIsoToJalaliParts(weekEnd);
    const endDay = endParts ? toPersianDigits(endParts.jd) : "";
    return toPersianDigits(`${parts.jd}–${endDay} ${monthName}`);
  }
  return toPersianDigits(`${parts.jd}/${parts.jm}`);
}

/** Tooltip title for a chart bucket */
export function formatChartBucketTitle(
  iso: string,
  granularity: "day" | "week" | "month"
): string {
  const parts = gregorianIsoToJalaliParts(iso);
  if (!parts) return gregorianToJalaliString(iso);
  const monthName = JALALI_MONTH_NAMES[parts.jm - 1] ?? "";
  if (granularity === "month") {
    return toPersianDigits(`${monthName} ${parts.jy}`);
  }
  if (granularity === "week") {
    const weekEnd = addDaysToGregorianIso(iso, 6);
    return `${gregorianToJalaliString(iso)} تا ${gregorianToJalaliString(weekEnd)}`;
  }
  return gregorianToJalaliString(iso);
}

/** datetime-local style value in local browser time from ISO */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

export function currentJalaliYearMonth(): { year: number; month: number } {
  const parts = gregorianIsoToJalaliParts(new Date().toISOString());
  return parts ? { year: parts.jy, month: parts.jm } : { year: 1400, month: 1 };
}

export function formatJalaliPeriod(year: number, month: number): string {
  const monthName = JALALI_MONTH_NAMES[month - 1] ?? String(month);
  return toPersianDigits(`${monthName} ${year}`);
}

export function addJalaliMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const zeroBased = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(zeroBased / 12),
    month: (zeroBased % 12) + 1,
  };
}

export function jalaliMonthRangeToGregorianIso(year: number, month: number): {
  start: string;
  end: string;
} {
  return {
    start: jalaliPartsToGregorianIso(year, month, 1),
    end: jalaliPartsToGregorianIso(
      year,
      month,
      jalaaliMonthLength(year, month)
    ),
  };
}

export function jalaliMonthDays(year: number, month: number): {
  jalaliDay: number;
  gregorianDate: string;
  weekdayIndex: number;
}[] {
  const length = jalaaliMonthLength(year, month);
  return Array.from({ length }, (_, index) => {
    const jalaliDay = index + 1;
    const gregorianDate = jalaliPartsToGregorianIso(year, month, jalaliDay);
    const [gy, gm, gd] = gregorianDate.split("-").map(Number);
    const weekday = new Date(gy, gm - 1, gd).getDay();
    return {
      jalaliDay,
      gregorianDate,
      weekdayIndex: (weekday + 1) % 7,
    };
  });
}
