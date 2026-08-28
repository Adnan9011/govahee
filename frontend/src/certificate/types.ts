export type CanvasElementType =
  | "text"
  | "qr"
  | "shape"
  | "line"
  | "logo"
  | "image"
  | "signature"
  | "seal"
  | "watermark"
  | "table";

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  fontSize?: number;
  fontWeight?: number | string;
  align?: "left" | "center" | "right" | "justify" | string;
  color?: string;
  font?: string;
  direction?: "rtl" | "ltr" | string;
  fill?: string;
  src?: string;
  opacity?: number;
  radius?: number;
  rows?: string[][];
}

export interface CanvasDoc {
  width_mm: number;
  height_mm: number;
  background?: { color?: string };
  elements: CanvasElement[];
}

export const SAMPLE_VARS_FA: Record<string, string> = {
  recipient_name: "علی احمدی",
  course_name: "زبان انگلیسی – B2",
  organization_name: "آموزشگاه نمونه",
  certificate_number: "CERT-2026-000001",
  issue_date: "2026-08-28",
  issuer_name: "آموزشگاه نمونه",
  score: "92",
  grade: "A",
  verification_url: "https://example.com/verify/preview",
};

export const TEMPLATE_VARIABLES = [
  "recipient_name",
  "course_name",
  "certificate_number",
  "issue_date",
  "expiry_date",
  "organization_name",
  "issuer_name",
  "score",
  "grade",
  "duration",
  "instructor_name",
];

export function substituteVars(text: string, vars: Record<string, string>) {
  return (text || "").replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
